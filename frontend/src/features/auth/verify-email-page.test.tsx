import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { VerifyEmailPage } from "./verify-email-page";
import { resendVerification, verifyEmail } from "./auth-client";

vi.mock("./auth-client", () => ({
  resendVerification: vi.fn().mockResolvedValue({}),
  verifyEmail: vi.fn()
}));

describe("VerifyEmailPage", () => {
  it("starts a resend cooldown after requesting a new code", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailPage />);

    await user.type(screen.getByLabelText("Email"), "hocvien@example.com");
    await user.click(screen.getByRole("button", { name: "Gửi lại mã xác thực" }));

    await waitFor(() => expect(resendVerification).toHaveBeenCalledWith({ email: "hocvien@example.com" }));
    expect(screen.getByRole("button", { name: /gửi lại sau 60s/i })).toBeDisabled();
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
