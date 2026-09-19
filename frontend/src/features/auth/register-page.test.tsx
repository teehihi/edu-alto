import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { RegisterPage } from "./register-page";

const { registerMock, pushMock } = vi.hoisted(() => ({ registerMock: vi.fn(), pushMock: vi.fn() }));

vi.mock("./auth-client", () => ({ register: registerMock }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => <header /> }));

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates the registration form in Vietnamese", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    expect(screen.getByText("Vui lòng nhập họ và tên.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập email hợp lệ.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("validates that password must contain both letters and digits", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText("Họ và tên"), "Nguyễn Nhật Thiên");
    await user.type(screen.getByLabelText("Email"), "thien@example.com");
    await user.type(screen.getByLabelText("Mật khẩu", { selector: "input" }), "21052005");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "21052005");
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    expect(screen.getByText("Mật khẩu phải bao gồm cả chữ và số.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("defaults to STUDENT role and submits student registration with optional learning goal", async () => {
    registerMock.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<RegisterPage />);

    const studentRadio = screen.getByRole("radio", { name: /học viên/i });
    const instructorRadio = screen.getByRole("radio", { name: /giảng viên/i });

    expect(studentRadio).toHaveAttribute("aria-checked", "true");
    expect(instructorRadio).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByText(/admin|quản trị viên/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Họ và tên"), "Nguyễn Nhật Thiên");
    await user.type(screen.getByLabelText("Email"), " thien@example.com ");
    await user.type(screen.getByLabelText(/tiểu sử/i), "Học React và Spring Boot");
    await user.type(screen.getByLabelText("Mật khẩu", { selector: "input" }), "Matkhau123");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "Matkhau123");
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    expect(registerMock).toHaveBeenCalledWith({
      fullName: "Nguyễn Nhật Thiên",
      email: "thien@example.com",
      password: "Matkhau123",
      confirmPassword: "Matkhau123",
      role: "STUDENT",
      bio: "Học React và Spring Boot"
    });
    expect(pushMock).toHaveBeenCalledWith("/verify-email?email=thien%40example.com&sent=1");
  });

  it("allows selecting INSTRUCTOR role, validates expertise, and submits instructor registration", async () => {
    registerMock.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<RegisterPage />);

    const instructorRadio = screen.getByRole("radio", { name: /giảng viên/i });
    await user.click(instructorRadio);

    expect(instructorRadio).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /học viên/i })).toHaveAttribute("aria-checked", "false");

    await user.type(screen.getByLabelText("Họ và tên"), "Thầy Giáo Ba");
    await user.type(screen.getByLabelText("Email"), "teacher@example.com");
    await user.type(screen.getByLabelText("Mật khẩu", { selector: "input" }), "Matkhau123");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "Matkhau123");

    // Click without expertise should validate
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));
    expect(screen.getByText("Vui lòng nhập chuyên môn giảng dạy.")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/chuyên môn giảng dạy/i), "Công nghệ Web");
    await user.type(screen.getByLabelText(/tiểu sử/i), "10 năm kinh nghiệm IT");
    await user.click(screen.getByRole("button", { name: /đăng ký/i }));

    expect(registerMock).toHaveBeenCalledWith({
      fullName: "Thầy Giáo Ba",
      email: "teacher@example.com",
      password: "Matkhau123",
      confirmPassword: "Matkhau123",
      role: "INSTRUCTOR",
      expertise: "Công nghệ Web",
      bio: "10 năm kinh nghiệm IT"
    });
  });
});
