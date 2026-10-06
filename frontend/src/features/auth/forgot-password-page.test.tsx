import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ForgotPasswordPage } from "./forgot-password-page";

const { forgotPasswordMock, verifyResetOtpMock, resetPasswordMock, pushMock } = vi.hoisted(() => ({
  forgotPasswordMock: vi.fn(),
  verifyResetOtpMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  pushMock: vi.fn(),
}));

let query = new URLSearchParams("");

vi.mock("./auth-client", () => ({
  forgotPassword: forgotPasswordMock,
  verifyResetOtp: verifyResetOtpMock,
  resetPassword: resetPasswordMock,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => query,
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => <header /> }));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = new URLSearchParams("");
  });

  it("validates email before submitting on step 1", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.click(screen.getByRole("button", { name: "Gửi mã xác minh" }));

    expect(screen.getByText("Vui lòng nhập email hợp lệ.")).toBeInTheDocument();
    expect(forgotPasswordMock).not.toHaveBeenCalled();
  });

  it("sends OTP and advances to step 2 (OTP verification)", async () => {
    forgotPasswordMock.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email tài khoản");
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: "Gửi mã xác minh" }));

    expect(forgotPasswordMock).toHaveBeenCalledWith({ email: "test@example.com" });

    // Step 2 should be visible now
    expect(await screen.findByRole("textbox", { name: "Mã OTP" })).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it("verifies OTP on step 2 and advances to step 3 (new password)", async () => {
    query = new URLSearchParams("email=test@example.com&sent=1");
    verifyResetOtpMock.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    // Starts directly at step 2 when email & sent=1 in query
    const otpInput = screen.getByRole("textbox", { name: "Mã OTP" });
    await user.type(otpInput, "654321");
    await user.click(screen.getByRole("button", { name: "Xác nhận mã" }));

    expect(verifyResetOtpMock).toHaveBeenCalledWith({
      email: "test@example.com",
      otp: "654321",
    });

    // Step 3 should be displayed
    expect(await screen.findByLabelText("Mật khẩu mới")).toBeInTheDocument();
    expect(screen.getByLabelText("Nhập lại mật khẩu mới")).toBeInTheDocument();
  });

  it("submits new password on step 3 and displays success state", async () => {
    query = new URLSearchParams("email=test@example.com&sent=1");
    verifyResetOtpMock.mockResolvedValueOnce({ success: true });
    resetPasswordMock.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    await user.type(screen.getByRole("textbox", { name: "Mã OTP" }), "654321");
    await user.click(screen.getByRole("button", { name: "Xác nhận mã" }));

    const newPassInput = await screen.findByLabelText("Mật khẩu mới");
    const confirmPassInput = screen.getByLabelText("Nhập lại mật khẩu mới");

    await user.type(newPassInput, "NewPassword123");
    await user.type(confirmPassInput, "NewPassword123");
    await user.click(screen.getByRole("button", { name: "Cập nhật mật khẩu" }));

    expect(resetPasswordMock).toHaveBeenCalledWith({
      email: "test@example.com",
      otp: "654321",
      newPassword: "NewPassword123",
      confirmPassword: "NewPassword123",
    });

    // Step 4 Success screen
    expect(await screen.findByText("Đặt lại mật khẩu thành công!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đăng nhập ngay" })).toBeInTheDocument();
  });
});
