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

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <header data-testid="app-header">EduAlto Header</header>,
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

  it("renders the global AppHeader and displays instructor courses instead of crashing with 403", async () => {
    render(<LearningPortal view="courses" />);

    // Global header is rendered
    expect(screen.getByTestId("app-header")).toBeInTheDocument();

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
});
