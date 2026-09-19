import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";

const logoutMock = vi.fn();
const pushMock = vi.fn();

let mockSessionState = {
  user: null as null | { fullName: string; email: string; roles: string[] },
  isAuthenticated: false,
  logout: logoutMock
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock, refresh: vi.fn() })
}));

vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => mockSessionState
}));

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionState = {
      user: null,
      isAuthenticated: false,
      logout: logoutMock
    };
  });

  it("renders login and register links when not authenticated", () => {
    render(<AppHeader />);
    expect(screen.getByRole("link", { name: "Đăng nhập" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tạo tài khoản" })).toBeInTheDocument();
  });

  it("renders Figma action icons and user avatar when authenticated, and opens dropdown on click", async () => {
    mockSessionState = {
      user: {
        fullName: "Nguyễn Nhật Thiên",
        email: "teehihi@edualto.vn",
        roles: ["STUDENT"]
      },
      isAuthenticated: true,
      logout: logoutMock
    };

    const user = userEvent.setup();
    render(<AppHeader />);

    // Check Figma header action icons
    expect(screen.getByRole("link", { name: "Giỏ hàng" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Khóa học yêu thích" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thông báo" })).toBeInTheDocument();

    // Check Avatar trigger
    const trigger = screen.getByRole("button", { name: /Menu người dùng/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getAllByAltText("Nguyễn Nhật Thiên")[0]).toBeInTheDocument();

    // Click to open dropdown
    await user.click(trigger);

    // Check dropdown content
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Nhật Thiên")).toBeInTheDocument();
    expect(screen.getByText("Học viên")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Trang cá nhân/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Khóa học của tôi/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Đăng xuất/i })).toBeInTheDocument();

    // Click logout
    await user.click(screen.getByRole("menuitem", { name: /Đăng xuất/i }));
    expect(logoutMock).toHaveBeenCalled();
  });
});
