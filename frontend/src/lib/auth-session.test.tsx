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
  updatedAt: "2026-09-17T00:00:00Z"
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
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("refreshes once on a 401 current-user response and keeps the new session", async () => {
    window.localStorage.setItem(
      "edualto.auth.session",
      JSON.stringify({
        accessToken: "old-access-token",
        refreshToken: "old-refresh-token",
        expiresAt: Date.now() + 60_000,
        user: activeUser
      })
    );

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Phiên đăng nhập không hợp lệ", details: [] }
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        success: true,
        data: {
          tokenType: "Bearer",
          accessToken: "new-access-token",
          expiresInSeconds: 900,
          refreshToken: "new-refresh-token",
          user: activeUser
        },
        meta: null
      }))
      .mockResolvedValueOnce(jsonResponse(200, {
        success: true,
        data: { ...activeUser, fullName: "Nguyen Van B" },
        meta: null
      }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthSessionProvider>
        <Probe />
      </AuthSessionProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    await userEvent.click(screen.getByRole("button", { name: "Tải lại" }));

    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("Nguyen Van B"));
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:8080/api/v1/me", expect.objectContaining({
      headers: expect.any(Headers)
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8080/api/v1/auth/refresh", expect.objectContaining({
      body: JSON.stringify({ refreshToken: "old-refresh-token" })
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "http://localhost:8080/api/v1/me", expect.objectContaining({
      headers: expect.any(Headers)
    }));

    const stored = JSON.parse(window.localStorage.getItem("edualto.auth.session") ?? "{}") as { refreshToken?: string };
    expect(stored.refreshToken).toBe("new-refresh-token");
  });
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
