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
  customHandle: "minhanh",
  bio: "Đam mê học hỏi công nghệ mới",
  avatarUrl: "https://example.com/avatar.png",
  language: "vi",
  websiteUrl: "https://minhanh.dev",
  tiktokUrl: "",
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

const otherUserProfile = {
  id: "user-2",
  fullName: "Trần Văn Bình",
  email: "binh@example.com",
  status: "ACTIVE" as const,
  roles: ["STUDENT"],
  headline: "Chuyên gia AI",
  customHandle: "binhai",
  bio: "Nghiên cứu thị giác máy tính",
  avatarUrl: "https://example.com/binh.png",
  language: "vi",
  websiteUrl: "https://binh.ai",
  tiktokUrl: "",
  xUrl: "",
  linkedinUrl: "",
  youtubeUrl: "",
  facebookUrl: "",
  studentProfile: null,
  instructorProfile: null,
  emailVerifiedAt: "2026-09-18T00:00:00Z",
  createdAt: "2026-09-18T00:00:00Z",
  updatedAt: "2026-09-18T00:00:00Z"
};

const getProfileMock = vi.fn().mockResolvedValue(userProfile);
const getPublicProfileMock = vi.fn().mockResolvedValue(otherUserProfile);
const updateProfileMock = vi.fn().mockResolvedValue({
  ...userProfile,
  fullName: "Nguyễn Minh Anh Updated",
  headline: "Senior Software Engineer",
  customHandle: "minhanh21"
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
    getPublicProfile: getPublicProfileMock,
    updateProfile: updateProfileMock,
    uploadAvatar: vi.fn().mockResolvedValue({ avatarUrl: "https://example.com/new-avatar.png" }),
    updateUserAvatar: vi.fn(),
    getCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn()
  }),
  getPublicProfile: (id: string) => getPublicProfileMock(id)
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads profile in view mode and toggles edit mode to save changes", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    // In View mode, user info is rendered
    expect(await screen.findByRole("heading", { name: "Nguyễn Minh Anh", level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText("Học viên xuất sắc").length).toBeGreaterThan(0);
    expect(screen.getByText("Tiếng Việt")).toBeInTheDocument();

    // Click "Chỉnh sửa" to enter Edit Mode
    const editBtn = screen.getByRole("button", { name: /chỉnh sửa/i });
    await user.click(editBtn);

    // Form inputs should now be present
    expect(await screen.findByDisplayValue("Nguyễn Minh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Anh")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Học viên xuất sắc")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Họ và Tên lót"));
    await user.type(screen.getByLabelText("Họ và Tên lót"), "Nguyễn Minh");
    await user.clear(screen.getByLabelText("Tên"));
    await user.type(screen.getByLabelText("Tên"), "Anh Updated");

    await user.clear(screen.getByLabelText(/chức danh/i));
    await user.type(screen.getByLabelText(/chức danh/i), "Senior Software Engineer");

    // Save changes
    await user.click(screen.getByRole("button", { name: /cập nhật/i }));

    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "Nguyễn Minh Anh Updated",
          headline: "Senior Software Engineer"
        })
      )
    );

    expect((await screen.findAllByText(/cập nhật thông tin hồ sơ thành công/i)).length).toBeGreaterThan(0);
    expect(await screen.findByRole("heading", { name: "Nguyễn Minh Anh Updated", level: 1 })).toBeInTheDocument();
  });

  it("renders navigation link to learning management page for owner", async () => {
    render(<ProfilePage />);

    expect(await screen.findByRole("heading", { name: "Nguyễn Minh Anh", level: 1 })).toBeInTheDocument();

    const learningLink = screen.getByRole("link", { name: /quản lý học tập/i });
    expect(learningLink).toHaveAttribute("href", "/learning");
  });

  it("renders teacher list for student when switching to Giảng viên tab", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    expect(await screen.findByRole("heading", { name: "Nguyễn Minh Anh", level: 1 })).toBeInTheDocument();

    const instructorTab = screen.getByRole("button", { name: /^giảng viên$/i });
    await user.click(instructorTab);

    expect(screen.getByRole("heading", { name: /giảng viên/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tìm kiếm giảng viên...")).toBeInTheDocument();
    expect(screen.getAllByText("Thầy Hoàng Văn Dũng").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /gửi tin nhắn/i }).length).toBeGreaterThan(0);
  });

  it("hides edit button and personal navigation tabs when viewing another user profile", async () => {
    render(<ProfilePage targetIdentifier="user-2" />);

    expect(await screen.findByRole("heading", { name: "Trần Văn Bình", level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText("Chuyên gia AI").length).toBeGreaterThan(0);

    // Edit button should not exist for visitor
    expect(screen.queryByRole("button", { name: /chỉnh sửa/i })).not.toBeInTheDocument();
    // Navigation panel should also be hidden for visitors
    expect(screen.queryByRole("link", { name: /quản lý học tập/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^giảng viên$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /đánh giá của tôi/i })).not.toBeInTheDocument();
  });
});

