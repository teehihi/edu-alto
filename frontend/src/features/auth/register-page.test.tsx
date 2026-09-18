import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { RegisterPage } from "./register-page";

const { registerMock, pushMock } = vi.hoisted(() => ({ registerMock: vi.fn(), pushMock: vi.fn() }));

vi.mock("./auth-client", () => ({ register: registerMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => <header /> }));

describe("RegisterPage", () => {
  it("validates the registration form in Vietnamese", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: /tạo tài khoản/i }));

    expect(screen.getByText("Vui lòng nhập họ và tên lót.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập tên.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập email hợp lệ.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("sends the backend contract and routes to email verification", async () => {
    registerMock.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Họ và Tên lót"), "Nguyễn Nhật");
    await user.type(screen.getByLabelText("Tên"), "Thiên");
    await user.type(screen.getByLabelText("Email"), " thien@example.com ");
    await user.type(screen.getByLabelText("Mật khẩu", { selector: "input" }), "Matkhau123");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "Matkhau123");
    await user.click(screen.getByRole("button", { name: /tạo tài khoản/i }));

    expect(registerMock).toHaveBeenCalledWith({
      fullName: "Nguyễn Nhật Thiên",
      email: "thien@example.com",
      password: "Matkhau123",
      confirmPassword: "Matkhau123"
    });
    expect(pushMock).toHaveBeenCalledWith("/verify-email?email=thien%40example.com&sent=1");
  });
});
