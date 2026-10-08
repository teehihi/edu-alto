import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningPortal, resetLearningPortalCache } from "./learning-portal";
import * as learningClient from "@/lib/learning-client";
import * as instructorCourseClient from "@/lib/instructor-course-client";
import { ApiClientError } from "@/lib/api";

const getAccessToken = vi.fn().mockResolvedValue("test-token");
let mockUser: { id: string; fullName: string; roles: string[] } | null = {
  id: "instructor-1",
  fullName: "Nguyễn Minh Anh",
  roles: ["INSTRUCTOR"],
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/learning/courses",
}));

vi.mock("@/components/layout/user-menu", () => ({
  UserMenu: () => <div data-testid="user-menu">EduAlto UserMenu</div>,
}));

vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => ({
    user: mockUser,
    isLoading: false,
    getAccessToken,
  }),
}));

describe("LearningPortal for instructors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetLearningPortalCache();
    mockUser = {
      id: "instructor-1",
      fullName: "Nguyễn Minh Anh",
      roles: ["INSTRUCTOR"],
    };
    getAccessToken.mockResolvedValue("test-token");

    vi.spyOn(instructorCourseClient, "fetchInstructorCourses").mockResolvedValue({
      data: [
        {
          id: "inst-c1",
          title: "Lập trình React nâng cao",
          slug: "lap-trinh-react-nang-cao",
          tagline: "Khóa học React thực chiến",
          description: "Mô tả khóa học",
          thumbnailKey: null,
          thumbnailUrl: null,
          price: 499000,
          originalPrice: 899000,
          level: "ADVANCED",
          language: "vi",
          subtitleLanguages: [],
          status: "PUBLISHED",
          createdAt: "2026-09-01T00:00:00Z",
          updatedAt: "2026-09-15T00:00:00Z",
          publishedAt: "2026-09-15T00:00:00Z",
        },
      ],
      meta: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
    });

    // Mock student enrollments failing with STUDENT_REQUIRED (403)
    vi.spyOn(learningClient, "fetchMyEnrollments").mockRejectedValue(
      new ApiClientError(403, {
        code: "STUDENT_REQUIRED",
        message: "Chức năng này dành cho tài khoản học viên đang hoạt động",
        details: [],
      }),
    );
  });

  it("renders the workspace topbar and displays instructor courses instead of crashing with 403", async () => {
    render(<LearningPortal view="courses" />);

    // Workspace topbar UserMenu is rendered
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();

    // The instructor teaching tab and course card are displayed
    await waitFor(() => {
      expect(screen.getByText("Khóa học giảng dạy")).toBeInTheDocument();
      expect(screen.getByText("Lập trình React nâng cao")).toBeInTheDocument();
    });

    // Metric is rendered
    expect(screen.getByText("Tổng khóa học")).toBeInTheDocument();
    expect(screen.getAllByText("Đang xuất bản").length).toBeGreaterThan(0);

    // Does NOT render the fatal error panel
    expect(screen.queryByText("Chưa thể tải khu vực học tập")).not.toBeInTheDocument();
  });

  it("allows switching to learning courses tab and shows polite instructor notice when no student enrollments exist", async () => {
    const user = userEvent.setup();
    render(<LearningPortal view="courses" />);

    const learningTab = await screen.findByRole("button", { name: /khóa học đang học/i });
    await user.click(learningTab);

    // Shows informative instructor explanation rather than raw error
    await waitFor(() => {
      expect(screen.getByText(/Bạn đang sử dụng tài khoản Giảng viên/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Xem khóa học giảng dạy/i })).toBeInTheDocument();
    });
  });

  it("renders redesigned overview with personalized greeting, stat cards, and allows dismissing instructor banner", async () => {
    const user = userEvent.setup();
    render(<LearningPortal view="overview" />);

    // Renders welcoming header
    await waitFor(() => {
      expect(screen.getByText(/Chào mừng trở lại/i)).toBeInTheDocument();
      expect(screen.getAllByText("Nguyễn Minh Anh").length).toBeGreaterThanOrEqual(1);
    });

    // 4 quick stat cards are displayed
    expect(screen.getByText("Khóa học của bạn")).toBeInTheDocument();
    expect(screen.getByText("Bài hoàn thành")).toBeInTheDocument();
    expect(screen.getByText("Chuỗi học tập")).toBeInTheDocument();
    expect(screen.getAllByText("Việc cần làm").length).toBeGreaterThanOrEqual(1);

    // Redesigned empty state card
    expect(screen.getByText(/Bắt đầu hành trình học tập cùng EduAlto/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tìm khóa học ngay/i })).toBeInTheDocument();

    // Weekly activity chart
    expect(screen.getByText("Hoạt động học tập tuần này")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thời gian học" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bài học" })).toBeInTheDocument();

    // Interactive instructor banner and dismiss action
    expect(screen.getByText("Bạn đang sử dụng tài khoản Giảng viên")).toBeInTheDocument();
    const dismissBtn = screen.getByRole("button", { name: "Đóng thông báo giảng viên" });
    await user.click(dismissBtn);
    expect(screen.queryByText("Bạn đang sử dụng tài khoản Giảng viên")).not.toBeInTheDocument();
  });

  it("renders active enrolled course card and progress when enrollments exist", async () => {
    vi.spyOn(learningClient, "fetchMyEnrollments").mockResolvedValue({
      data: [
        {
          id: "en-1",
          courseId: "c-1",
          courseTitle: "Next.js Thực Chiến Toàn Diện",
          courseSlug: "nextjs-thuc-chien",
          courseStatus: "PUBLISHED",
          status: "ACTIVE",
          enrolledAt: "2026-09-01T00:00:00Z",
        },
      ],
      meta: { page: 0, size: 10, totalElements: 1, totalPages: 1 },
    });

    vi.spyOn(learningClient, "fetchCourseProgress").mockResolvedValue({
      courseId: "c-1",
      totalLessons: 12,
      completedLessons: 6,
      progressPercent: 50,
      completed: false,
    });

    render(<LearningPortal view="overview" />);

    await waitFor(() => {
      expect(screen.getByText("Next.js Thực Chiến Toàn Diện")).toBeInTheDocument();
      expect(screen.getByText(/6\/12 bài học hoàn thành/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Tiếp tục học ngay/i })).toBeInTheDocument();
    });
  });
});
