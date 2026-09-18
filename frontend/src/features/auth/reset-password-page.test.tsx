import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ResetPasswordPage } from "./reset-password-page";

const { resetPasswordMock, verifyResetOtpMock } = vi.hoisted(() => ({ resetPasswordMock: vi.fn(), verifyResetOtpMock: vi.fn() }));
let query = new URLSearchParams("email=student%40example.com&sent=1");

vi.mock("./auth-client", () => ({
  resetPassword: resetPasswordMock,
  verifyResetOtp: verifyResetOtpMock
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => query }));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => <header /> }));

describe("ResetPasswordPage", () => {
  it("prefills the email from the query and validates the OTP", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    expect(screen.getByLabelText("Email")).toHaveValue("student@example.com");
    expect(screen.getByText("Mã đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kiểm tra mã" }));

    expect(screen.getAllByText("Mã đặt lại mật khẩu gồm 6 chữ số.").length).toBeGreaterThan(0);
    expect(verifyResetOtpMock).not.toHaveBeenCalled();
  });

  it("verifies the OTP and submits the new password", async () => {
    query = new URLSearchParams("email=student%40example.com");
    verifyResetOtpMock.mockResolvedValueOnce({});
    resetPasswordMock.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await user.type(screen.getByRole("textbox", { name: "Mã OTP" }), "123456");
    await user.click(screen.getByRole("button", { name: "Kiểm tra mã" }));
    expect(verifyResetOtpMock).toHaveBeenCalledWith({ email: "student@example.com", otp: "123456" });

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
