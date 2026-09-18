import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginPage } from "./login-page";

const loginMock = vi.fn();
vi.mock("./auth-client", () => ({
  useAuth: () => ({
    login: loginMock
  })
}));

describe("LoginPage", () => {
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
});
