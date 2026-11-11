import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstructorAnalyticsPage } from "./instructor-analytics-page";
import {
  fetchInstructorAnalyticsOverview,
  type InstructorAnalyticsOverview,
} from "@/lib/instructor-analytics-client";

vi.mock("@/lib/instructor-analytics-client", () => ({
  fetchInstructorAnalyticsOverview: vi.fn(),
}));

vi.mock("@/features/auth/auth-client", () => ({
  useAuth: () => ({
    user: { id: "teacher-1", fullName: "Nguyễn Văn Giảng Viên", avatarUrl: null },
    accessToken: "mock-token",
    loading: false,
  }),
}));

const mockOverview: InstructorAnalyticsOverview = {
  summary: {
    totalStudents: 150,
    newStudentsThisMonth: 25,
    totalRevenue: 45000000,
    revenueThisMonth: 7500000,
    averageCompletionRate: 68.4,
    totalCertificates: 42,
    totalCompletedLessons: 620,
  },
  monthlyTrends: [
    {
      month: "2026-10",
      label: "10/2026",
      newEnrollments: 20,
      completedCount: 15,
      revenue: 6000000,
      completionRate: 75.0,
    },
    {
      month: "2026-11",
      label: "11/2026",
      newEnrollments: 25,
      completedCount: 18,
      revenue: 7500000,
      completionRate: 72.0,
    },
  ],
  coursePerformances: [
    {
      courseId: "course-1",
      courseTitle: "Lập trình React & Next.js chuyên sâu",
      courseStatus: "PUBLISHED",
      price: 499000,
      studentCount: 100,
      completedStudentsCount: 30,
      completionRate: 70.5,
      totalLessons: 45,
      revenue: 35000000,
      averageRating: 4.8,
      reviewCount: 35,
    },
    {
      courseId: "course-2",
      courseTitle: "Spring Boot & Microservices nâng cao",
      courseStatus: "PUBLISHED",
      price: 599000,
      studentCount: 50,
      completedStudentsCount: 12,
      completionRate: 64.2,
      totalLessons: 60,
      revenue: 10000000,
      averageRating: 4.9,
      reviewCount: 18,
    },
  ],
};

describe("InstructorAnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page header and KPI cards with correct data", async () => {
    vi.mocked(fetchInstructorAnalyticsOverview).mockResolvedValueOnce(mockOverview);

    render(<InstructorAnalyticsPage />);

    expect(
      screen.getByRole("heading", { name: /phân tích số liệu học tập & doanh thu/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/45.000.000đ/)).toBeInTheDocument();
      expect(screen.getByText(/150/)).toBeInTheDocument();
      expect(screen.getByText(/68.4%/)).toBeInTheDocument();
      expect(screen.getByText(/42/)).toBeInTheDocument();
    });

    // Check course list rendered in table and options
    expect(screen.getAllByText("Lập trình React & Next.js chuyên sâu")).toHaveLength(2);
    expect(screen.getAllByText("Spring Boot & Microservices nâng cao")).toHaveLength(2);
  });

  it("allows switching chart view tabs", async () => {
    vi.mocked(fetchInstructorAnalyticsOverview).mockResolvedValueOnce(mockOverview);

    render(<InstructorAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Lập trình React & Next.js chuyên sâu")).toHaveLength(2);
    });

    const enrollmentsTab = screen.getByRole("button", { name: "Học viên mới" });
    fireEvent.click(enrollmentsTab);

    expect(
      screen.getByText(/số lượng học viên đăng ký mới & hoàn thành khóa học/i),
    ).toBeInTheDocument();

    const revenueTab = screen.getByRole("button", { name: "Doanh thu" });
    fireEvent.click(revenueTab);

    expect(screen.getByText(/doanh thu từng tháng \(vnd\)/i)).toBeInTheDocument();
  });

  it("triggers data reload when selecting another course in filter", async () => {
    vi.mocked(fetchInstructorAnalyticsOverview).mockResolvedValue(mockOverview);

    render(<InstructorAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Lập trình React & Next.js chuyên sâu")).toHaveLength(2);
    });

    const select = screen.getByLabelText("Lọc theo khóa học");
    fireEvent.change(select, { target: { value: "course-1" } });

    await waitFor(() => {
      expect(fetchInstructorAnalyticsOverview).toHaveBeenCalledWith("mock-token", "course-1");
    });
  });

  it("preserves all course options in dropdown after filtering to a single course", async () => {
    const filteredOverview: InstructorAnalyticsOverview = {
      ...mockOverview,
      coursePerformances: [mockOverview.coursePerformances[0]],
    };
    vi.mocked(fetchInstructorAnalyticsOverview)
      .mockResolvedValueOnce(mockOverview)
      .mockResolvedValueOnce(filteredOverview);

    render(<InstructorAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Spring Boot & Microservices nâng cao")).toHaveLength(2);
    });

    const select = screen.getByLabelText("Lọc theo khóa học");
    fireEvent.change(select, { target: { value: "course-1" } });

    await waitFor(() => {
      expect(fetchInstructorAnalyticsOverview).toHaveBeenCalledWith("mock-token", "course-1");
      expect(screen.getByText("1 khóa học đang hiển thị")).toBeInTheDocument();
    });

    // Both course options must remain selectable in the dropdown even though table shows only 1
    expect(
      screen.getByRole("option", { name: "Lập trình React & Next.js chuyên sâu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Spring Boot & Microservices nâng cao" }),
    ).toBeInTheDocument();
  });

  it("displays error message when API fails and retries on button click", async () => {
    vi.mocked(fetchInstructorAnalyticsOverview)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockOverview);

    render(<InstructorAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/không thể tải dữ liệu phân tích/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText(/45.000.000đ/)).toBeInTheDocument();
    });
  });
});
