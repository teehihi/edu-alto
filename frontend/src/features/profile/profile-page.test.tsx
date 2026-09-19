import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ProfilePage } from "./profile-page";

const currentUser = {
  id: "user-1",
  fullName: "Nguyễn Minh Anh",
  email: "minhanh@example.com",
  status: "ACTIVE" as const,
  roles: ["STUDENT"],
  emailVerifiedAt: "2026-09-18T00:00:00Z",
  createdAt: "2026-09-18T00:00:00Z",
  updatedAt: "2026-09-18T00:00:00Z"
};

const userProfile = {
  ...currentUser,
  headline: "Học viên xuất sắc",
  bio: "Đam mê học hỏi công nghệ mới",
  avatarUrl: "https://example.com/avatar.png",
  language: "vi",
  websiteUrl: "https://minhanh.dev",
  xUrl: "",
  linkedinUrl: "https://linkedin.com/in/minhanh",
  youtubeUrl: "",
  facebookUrl: "",
  studentProfile: {
    learningGoal: "Làm chủ Spring Boot & Next.js",
    occupation: "Sinh viên",
    educationLevel: "Đại học",
    interests: "Java, TypeScript"
  },
  instructorProfile: null
};

const getProfileMock = vi.fn().mockResolvedValue(userProfile);
const updateProfileMock = vi.fn().mockResolvedValue({
  ...userProfile,
  fullName: "Nguyễn Minh Anh Updated",
  headline: "Senior Software Engineer"
});
const logoutMock = vi.fn().mockResolvedValue({});

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => null
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => null
}));

vi.mock("@/features/auth/auth-client", () => ({
  useAuth: () => ({
    user: currentUser,
    loading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: logoutMock,
    getProfile: getProfileMock,
    updateProfile: updateProfileMock,
    uploadAvatar: vi.fn().mockResolvedValue({ avatarUrl: "https://example.com/new-avatar.png" }),
    updateUserAvatar: vi.fn(),
    getCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn()
  })
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the current profile and saves editable fields", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    expect(await screen.findByDisplayValue("Nguyễn Minh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Anh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Học viên xuất sắc")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Họ và Tên lót"));
    await user.type(screen.getByLabelText("Họ và Tên lót"), "Nguyễn Minh");
    await user.clear(screen.getByLabelText("Tên"));
    await user.type(screen.getByLabelText("Tên"), "Anh Updated");

    await user.clear(screen.getByLabelText(/chức danh/i));
    await user.type(screen.getByLabelText(/chức danh/i), "Senior Software Engineer");

    await user.click(screen.getByRole("button", { name: /cập nhật/i }));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "Nguyễn Minh Anh Updated",
          headline: "Senior Software Engineer"
        })
      )
    );

    expect(await screen.findByText("Cập nhật thông tin hồ sơ thành công!")).toBeInTheDocument();
  });

  it("renders navigation link to learning management page", async () => {
    render(<ProfilePage />);

    expect(await screen.findByDisplayValue("Nguyễn Minh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Anh")).toBeInTheDocument();

    const learningLink = screen.getByRole("link", { name: /quản lý học tập/i });
    expect(learningLink).toHaveAttribute("href", "/learning");
  });

  it("renders teacher list for student when switching to Giảng viên tab", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    expect(await screen.findByDisplayValue("Nguyễn Minh")).toBeInTheDocument();

    const instructorTab = screen.getByRole("button", { name: /^giảng viên$/i });
    await user.click(instructorTab);

    expect(screen.getByRole("heading", { name: /giảng viên/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tìm kiếm giảng viên...")).toBeInTheDocument();
    expect(screen.getAllByText("Thầy Hoàng Văn Dũng").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /gửi tin nhắn/i }).length).toBeGreaterThan(0);
  });
});

