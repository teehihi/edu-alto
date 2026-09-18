import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { VerifyEmailPage } from "./verify-email-page";
import { resendVerification, verifyEmail } from "./auth-client";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("./auth-client", () => ({ resendVerification: vi.fn(), verifyEmail: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/verify-email");
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => vi.useRealTimers());

describe("VerifyEmailPage", () => {
  it("starts a resend cooldown and prevents repeated requests", async () => {
    vi.mocked(resendVerification).mockResolvedValue({ message: "Đã gửi" });
    const user = userEvent.setup();
    render(<VerifyEmailPage />);
    await user.type(screen.getByLabelText("Email"), "hocvien@example.com");
    await user.click(screen.getByRole("button", { name: "Gửi lại OTP" }));
    await waitFor(() => expect(resendVerification).toHaveBeenCalledWith({ email: "hocvien@example.com" }));
    const resend = screen.getByRole("button", { name: /gửi lại sau 60s/i });
    expect(resend).toBeDisabled();
    await user.click(resend);
    expect(resendVerification).toHaveBeenCalledTimes(1);
    expect(verifyEmail).not.toHaveBeenCalled();
  });

  it("prefills registration email, verifies the pasted code and counts down to login", async () => {
    vi.useFakeTimers();
    vi.mocked(verifyEmail).mockResolvedValue({ message: "Đã xác thực" });
    window.history.replaceState({}, "", "/verify-email?email=hocvien%40example.com&sent=1");
    render(<VerifyEmailPage />);
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Mã OTP" }), { target: { value: "012345" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Xác nhận" })); });
    expect(verifyEmail).toHaveBeenCalledWith({ email: "hocvien@example.com", otp: "012345" });
    expect(screen.getByRole("dialog")).toBeVisible();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(/sau 2 giây/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(pushMock).toHaveBeenCalledWith("/login");
  });

  it("keeps the user on the form when the code is expired", async () => {
    vi.mocked(verifyEmail).mockRejectedValue(new Error("Mã xác thực đã hết hạn."));
    window.history.replaceState({}, "", "/verify-email?email=hocvien%40example.com");
    const user = userEvent.setup();
    render(<VerifyEmailPage />);
    await user.type(screen.getByRole("textbox", { name: "Mã OTP" }), "123456");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(await screen.findByText("Mã xác thực đã hết hạn.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
