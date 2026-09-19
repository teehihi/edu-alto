import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ResetPasswordPage } from "./reset-password-page";

const { resetPasswordMock, verifyResetOtpMock, pushMock } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn(),
  verifyResetOtpMock: vi.fn(),
  pushMock: vi.fn()
}));
let query = new URLSearchParams("email=student%40example.com&sent=1");

vi.mock("./auth-client", () => ({
  resetPassword: resetPasswordMock,
  verifyResetOtp: verifyResetOtpMock,
  forgotPassword: vi.fn()
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => query,
  useRouter: () => ({ push: pushMock })
}));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => <header /> }));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills the email and validates the OTP on step 1", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    expect(screen.getByLabelText("Email tài khoản")).toHaveValue("student@example.com");
    expect(screen.getByText(/Mã xác minh đặt lại mật khẩu đã được gửi/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Xác nhận mã" }));

    expect(screen.getByText("Mã xác minh gồm 6 chữ số.")).toBeInTheDocument();
    expect(verifyResetOtpMock).not.toHaveBeenCalled();
  });

  it("verifies the OTP on step 1 and advances to step 2 for setting new password", async () => {
    query = new URLSearchParams("email=student%40example.com");
    verifyResetOtpMock.mockResolvedValueOnce({});
    resetPasswordMock.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByRole("textbox", { name: "Mã OTP" }), "123456");
    await user.click(screen.getByRole("button", { name: "Xác nhận mã" }));

    expect(verifyResetOtpMock).toHaveBeenCalledWith({ email: "student@example.com", otp: "123456" });

    // Step 2 should be displayed now
    expect(await screen.findByLabelText("Mật khẩu mới")).toBeInTheDocument();
    expect(screen.getByLabelText("Nhập lại mật khẩu mới")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Mật khẩu mới"), "Matkhau123");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu mới"), "Matkhau123");
    await user.click(screen.getByRole("button", { name: /cập nhật mật khẩu/i }));

    expect(resetPasswordMock).toHaveBeenCalledWith({
      email: "student@example.com",
      otp: "123456",
      newPassword: "Matkhau123",
      confirmPassword: "Matkhau123"
    });
  });
});
