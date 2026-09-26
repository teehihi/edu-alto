import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthSessionProvider, useAuthSession } from "@/lib/auth-session";

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
  const { isLoading, user, reloadCurrentUser } = useAuthSession();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="name">{user?.fullName ?? "Chưa đăng nhập"}</span>
      <button type="button" onClick={() => void reloadCurrentUser()}>
        Tải lại
      </button>
    </div>
  );
}

describe("AuthSessionProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
