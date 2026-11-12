import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { AuthSessionProvider, useAuthSession } from "@/lib/auth-session";
import { getBrowserQueryClient } from "@/lib/query-provider";

const activeUser = {
  id: "8a846b8b-7e11-4a0e-85d8-45e080e942e7",
  fullName: "Nguyen Van A",
  email: "student@example.com",
  status: "ACTIVE",
  roles: ["STUDENT"],
  emailVerifiedAt: "2026-09-17T00:00:00Z",
  createdAt: "2026-09-17T00:00:00Z",
  updatedAt: "2026-09-17T00:00:00Z",
};

function Probe() {
  const { isLoading, user, reloadCurrentUser, logout, refreshSession, getAccessToken } =
    useAuthSession();
  const [token, setToken] = useState<string | null>(null);

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="name">{user?.fullName ?? "Chưa đăng nhập"}</span>
      <span data-testid="token">{token}</span>
      <button type="button" onClick={() => void reloadCurrentUser()}>
        Tải lại
      </button>
      <button type="button" onClick={() => void logout()}>
        Đăng xuất
      </button>
      <button
        type="button"
        onClick={async () => {
          await refreshSession();
          setToken(await getAccessToken());
        }}
      >
        Làm mới token
      </button>
    </div>
  );
}

describe("AuthSessionProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("restores session via refresh cookie on mount, then handles 401 + retry on reloadCurrentUser", async () => {
    const fetchMock = vi
      .fn()
      // 1st call: POST /auth/refresh on mount (cookie sent automatically by browser)
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: {
            tokenType: "Bearer",
            accessToken: "restored-access-token",
            expiresInSeconds: 900,
            user: activeUser,
          },
          meta: null,
        }),
      )
      // 2nd call: GET /me — returns 401 (access token expired)
      .mockResolvedValueOnce(
        jsonResponse(401, {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Phiên đăng nhập không hợp lệ", details: [] },
        }),
      )
      // 3rd call: POST /auth/refresh — rotation via cookie
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: {
            tokenType: "Bearer",
            accessToken: "new-access-token",
            expiresInSeconds: 900,
            user: activeUser,
          },
          meta: null,
        }),
      )
      // 4th call: GET /me — success with new name
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: { ...activeUser, fullName: "Nguyen Van B" },
          meta: null,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthSessionProvider>
        <Probe />
      </AuthSessionProvider>,
    );

    // Wait for mount refresh to complete
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("name")).toHaveTextContent("Nguyen Van A");

    // Click reload — triggers 401 → refresh → retry
    await userEvent.click(screen.getByRole("button", { name: "Tải lại" }));

    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("Nguyen Van B"));

    // Verify: mount refresh call has no body (cookie-based)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/api/v1/auth/refresh",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    // Verify: no localStorage was used
    expect(window.localStorage.getItem("edualto.auth.session")).toBeNull();
  });

  it("shows unauthenticated state when refresh cookie is missing (no session)", async () => {
    const fetchMock = vi
      .fn()
      // POST /auth/refresh fails — no cookie
      .mockResolvedValueOnce(
        jsonResponse(401, {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Phiên đăng nhập không hợp lệ", details: [] },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthSessionProvider>
        <Probe />
      </AuthSessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("name")).toHaveTextContent("Chưa đăng nhập");
  });

  it("uses the rotated token immediately within the same callback", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse("old-token"))
        .mockResolvedValueOnce(tokenResponse("new-token")),
    );
    render(
      <AuthSessionProvider>
        <Probe />
      </AuthSessionProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await userEvent.click(screen.getByRole("button", { name: "Làm mới token" }));
    await waitFor(() => expect(screen.getByTestId("token")).toHaveTextContent("new-token"));
  });

  it("does not restore a session when an in-flight refresh finishes after logout", async () => {
    let resolveRefresh!: (response: Response) => void;
    const refresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(refresh)
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <AuthSessionProvider>
        <Probe />
      </AuthSessionProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    await act(async () => {
      resolveRefresh(tokenResponse("late-token"));
    });
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("name")).toHaveTextContent("Chưa đăng nhập");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:8080/api/v1/auth/logout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("serializes cross-tab refresh calls through navigator.locks when BroadcastChannel is unavailable", async () => {
    let lockTail = Promise.resolve();
    const requestMock = vi.fn(
      (_name: string, callback: () => Promise<unknown>) =>
        new Promise((resolve, reject) => {
          lockTail = lockTail
            .then(() => callback())
            .then(resolve, reject)
            .catch(() => undefined);
        }),
    );
    vi.stubGlobal("BroadcastChannel", undefined);
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request: requestMock },
    });

    let inFlightRefresh = 0;
    let maxConcurrentRefresh = 0;
    let callCount = 0;
    const fetchMock = vi.fn(async () => {
      inFlightRefresh++;
      maxConcurrentRefresh = Math.max(maxConcurrentRefresh, inFlightRefresh);
      await new Promise((resolve) => setTimeout(resolve, 15));
      inFlightRefresh--;
      callCount++;
      return tokenResponse(`rotated-token-${callCount}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      render(
        <>
          <AuthSessionProvider>
            <Probe />
          </AuthSessionProvider>
          <AuthSessionProvider>
            <Probe />
          </AuthSessionProvider>
        </>,
      );

      await waitFor(() =>
        expect(screen.getAllByTestId("loading").every((node) => node.textContent === "false")).toBe(
          true,
        ),
      );

      expect(requestMock).toHaveBeenCalledTimes(2);
      expect(requestMock).toHaveBeenNthCalledWith(1, "edualto.auth.refresh", expect.any(Function));
      expect(requestMock).toHaveBeenNthCalledWith(2, "edualto.auth.refresh", expect.any(Function));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(maxConcurrentRefresh).toBe(1);
    } finally {
      Reflect.deleteProperty(navigator, "locks");
    }
  });

  it("shares refreshed session and logout state across tabs when BroadcastChannel is available", async () => {
    class MockBroadcastChannel {
      private static channels = new Map<string, Set<MockBroadcastChannel>>();
      private readonly name: string;
      onmessage: ((event: MessageEvent) => void) | null = null;

      constructor(name: string) {
        this.name = name;
        const peers = MockBroadcastChannel.channels.get(name) ?? new Set();
        peers.add(this);
        MockBroadcastChannel.channels.set(name, peers);
      }

      postMessage(data: unknown) {
        const peers = MockBroadcastChannel.channels.get(this.name);
        if (!peers) return;
        for (const peer of peers) {
          if (peer !== this && peer.onmessage) {
            peer.onmessage(new MessageEvent("message", { data }));
          }
        }
      }

      close() {
        MockBroadcastChannel.channels.get(this.name)?.delete(this);
      }
    }

    let lockTail = Promise.resolve();
    const requestMock = vi.fn(
      (_name: string, callback: () => Promise<unknown>) =>
        new Promise((resolve, reject) => {
          lockTail = lockTail
            .then(() => callback())
            .then(resolve, reject)
            .catch(() => undefined);
        }),
    );
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request: requestMock },
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return tokenResponse("shared-token");
      })
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      render(
        <>
          <AuthSessionProvider>
            <Probe />
          </AuthSessionProvider>
          <AuthSessionProvider>
            <Probe />
          </AuthSessionProvider>
        </>,
      );

      await waitFor(() =>
        expect(screen.getAllByTestId("loading").every((node) => node.textContent === "false")).toBe(
          true,
        ),
      );
      expect(screen.getAllByTestId("name").map((n) => n.textContent)).toEqual([
        "Nguyen Van A",
        "Nguyen Van A",
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getAllByRole("button", { name: "Đăng xuất" })[0]);
      await waitFor(() =>
        expect(screen.getAllByTestId("name").map((n) => n.textContent)).toEqual([
          "Chưa đăng nhập",
          "Chưa đăng nhập",
        ]),
      );
    } finally {
      Reflect.deleteProperty(navigator, "locks");
    }
  });

  it("clears the React Query cache on logout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("active-token"))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: {} }));
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = getBrowserQueryClient();
    queryClient.setQueryData(["learning", "enrollments", activeUser.id], [{ id: "en-1" }]);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);

    render(
      <AuthSessionProvider>
        <Probe />
      </AuthSessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("Chưa đăng nhập"));
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(getBrowserQueryClient().getQueryCache().getAll()).toHaveLength(0);
  });
});

function tokenResponse(accessToken: string) {
  return jsonResponse(200, {
    success: true,
    data: { tokenType: "Bearer", accessToken, expiresInSeconds: 900, user: activeUser },
    meta: null,
  });
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
