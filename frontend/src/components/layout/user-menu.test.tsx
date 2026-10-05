import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { UserMenu } from "./user-menu";

const logoutMock = vi.fn();
const pushMock = vi.fn();
const refreshMock = vi.fn();

let mockSessionState = {
  user: null as null | {
    fullName: string;
    email: string;
    roles: string[];
    avatarUrl?: string | null;
  },
  isAuthenticated: false,
  logout: logoutMock,
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => mockSessionState,
}));

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionState = {
      user: null,
      isAuthenticated: false,
      logout: logoutMock,
    };
  });

  it("renders nothing when unauthenticated", () => {
    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  it("renders avatar linking directly to /profile for student", () => {
    mockSessionState = {
      user: {
        fullName: "Học Viên A",
        email: "student@edualto.vn",
        roles: ["STUDENT"],
      },
      isAuthenticated: true,
      logout: logoutMock,
    };

    render(<UserMenu />);

    // Avatar link points to /profile
    const avatarLink = screen.getByRole("link", { name: /Trang cá nhân: Học Viên A/i });
    expect(avatarLink).toBeInTheDocument();
    expect(avatarLink).toHaveAttribute("href", "/profile");
  });

  it("opens menu on toggle button click and displays student links", async () => {
    mockSessionState = {
      user: {
        fullName: "Học Viên A",
        email: "student@edualto.vn",
        roles: ["STUDENT"],
      },
      isAuthenticated: true,
      logout: logoutMock,
    };

    const user = userEvent.setup();
    render(<UserMenu />);

    const toggleButton = screen.getByRole("button", { name: /Menu người dùng: Học Viên A/i });
    await user.click(toggleButton);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Học viên")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Trang cá nhân/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Khóa học của tôi/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Cài đặt tài khoản/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Đăng xuất/i })).toBeInTheDocument();

    // Student should not see admin or instructor links
    expect(screen.queryByRole("menuitem", { name: /Quản trị hệ thống/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /Bảng điều khiển giảng viên/i }),
    ).not.toBeInTheDocument();
  });

  it("renders admin role badge and admin payments link when user is ADMIN", async () => {
    mockSessionState = {
      user: {
        fullName: "Quản trị viên EduAlto",
        email: "admin@edualto.local",
        roles: ["ADMIN"],
      },
      isAuthenticated: true,
      logout: logoutMock,
    };

    const user = userEvent.setup();
    render(<UserMenu />);

    const toggleButton = screen.getByRole("button", { name: /Menu người dùng/i });
    await user.click(toggleButton);

    expect(screen.getByText("Quản trị viên")).toBeInTheDocument();
    const adminLink = screen.getByRole("menuitem", { name: /Quản trị hệ thống/i });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute("href", "/admin/payments");
  });

  it("renders instructor role badge and instructor dashboard link when user is INSTRUCTOR", async () => {
    mockSessionState = {
      user: {
        fullName: "Giảng viên B",
        email: "instructor@edualto.vn",
        roles: ["INSTRUCTOR"],
      },
      isAuthenticated: true,
      logout: logoutMock,
    };

    const user = userEvent.setup();
    render(<UserMenu />);

    const toggleButton = screen.getByRole("button", { name: /Menu người dùng/i });
    await user.click(toggleButton);

    expect(screen.getByText("Giảng viên")).toBeInTheDocument();
    const instructorLink = screen.getByRole("menuitem", { name: /Bảng điều khiển giảng viên/i });
    expect(instructorLink).toBeInTheDocument();
    expect(instructorLink).toHaveAttribute("href", "/instructor");
  });

  it("opens menu on mouse hover (pointerEnter)", async () => {
    mockSessionState = {
      user: {
        fullName: "Học Viên A",
        email: "student@edualto.vn",
        roles: ["STUDENT"],
      },
      isAuthenticated: true,
      logout: logoutMock,
    };

    const { container } = render(<UserMenu />);
    const menuContainer = container.firstChild as HTMLElement;

    fireEvent.pointerEnter(menuContainer, { pointerType: "mouse" });

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("calls logout when clicking Đăng xuất", async () => {
    mockSessionState = {
      user: {
        fullName: "Học Viên A",
        email: "student@edualto.vn",
        roles: ["STUDENT"],
      },
      isAuthenticated: true,
      logout: logoutMock,
    };

    const user = userEvent.setup();
    render(<UserMenu />);

    const toggleButton = screen.getByRole("button", { name: /Menu người dùng/i });
    await user.click(toggleButton);

    const logoutBtn = screen.getByRole("menuitem", { name: /Đăng xuất/i });
    await user.click(logoutBtn);

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
