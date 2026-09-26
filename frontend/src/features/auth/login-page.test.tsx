import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginPage } from "./login-page";

const loginMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => null }));
vi.mock("./auth-client", () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Vietnamese validation messages before calling the API", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(screen.getByText("Vui lòng nhập email hợp lệ.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("toggles password visibility without submitting", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText("Mật khẩu");
    await user.type(passwordInput, "Matkhau123");
    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("redirects to home page upon successful login", async () => {
    loginMock.mockResolvedValueOnce({
      id: "test-user-id",
      fullName: "Nguyễn Nhật Thiên",
      email: "test@example.com",
    });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), "Matkhau123");
    await user.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(loginMock).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Matkhau123",
    });
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("redirects to verify-email when account is not verified", async () => {
    loginMock.mockRejectedValueOnce({ code: "ACCOUNT_NOT_VERIFIED" });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "unverified@example.com");
    await user.type(screen.getByLabelText("Mật khẩu"), "Matkhau123");
    await user.click(screen.getByRole("button", { name: /đăng nhập/i }));

    expect(pushMock).toHaveBeenCalledWith("/verify-email?email=unverified%40example.com&sent=1");
  });
});
