import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentAnalyticsView } from "./student-analytics-view";
import { ApiClientError } from "@/lib/api";
import * as studentAnalyticsClient from "@/lib/student-analytics-client";

const getAccessToken = vi.fn().mockResolvedValue("test-token");

vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => ({
    user: { id: "student-1", fullName: "Trần Minh Quân", roles: ["STUDENT"] },
    isLoading: false,
    getAccessToken,
  }),
}));

const sampleOverview7: studentAnalyticsClient.StudentLearningAnalyticsOverview = {
  windowDays: 7,
  summary: {
    activeCourseCount: 1,
    totalLessons: 10,
    completedLessons: 6,
    completionRate: 60,
    overallAverageScoreOutOf10: 7.5,
    averageQuizScoreOutOf10: 7.0,
    quizPassRate: 50,
    attemptedQuizzesCount: 2,
    passedQuizzesCount: 1,
    averageAssignmentScoreOutOf10: 8.5,
    publishedAssignmentsCount: 2,
    submittedAssignmentsCount: 2,
    onTimeAssignmentsCount: 2,
    currentStreakDays: 4,
    longestStreakDays: 9,
    activeDaysInWindow: 5,
    estimatedStudyHoursInWindow: 6.5,
    completedLessonsInWindow: 4,
    currentWeekHours: 4.5,
    currentWeekActiveDays: 4,
  },
  currentWeekActivity: [
    {
      date: "2026-11-09",
      label: "T2",
      fullLabel: "Thứ 2, 09/11",
      studyHours: 1.5,
      studyMinutes: 90,
      completedLessons: 2,
      today: false,
    },
    {
      date: "2026-11-10",
      label: "T3",
      fullLabel: "Thứ 3, 10/11",
      studyHours: 1.0,
      studyMinutes: 60,
      completedLessons: 1,
      today: false,
    },
    {
      date: "2026-11-11",
      label: "T4",
      fullLabel: "Thứ 4, 11/11",
      studyHours: 1.0,
      studyMinutes: 60,
      completedLessons: 1,
      today: false,
    },
    {
      date: "2026-11-12",
      label: "T5",
      fullLabel: "Thứ 5, 12/11",
      studyHours: 1.0,
      studyMinutes: 60,
      completedLessons: 0,
      today: true,
    },
    {
      date: "2026-11-13",
      label: "T6",
      fullLabel: "Thứ 6, 13/11",
      studyHours: 0,
      studyMinutes: 0,
      completedLessons: 0,
      today: false,
    },
    {
      date: "2026-11-14",
      label: "T7",
      fullLabel: "Thứ 7, 14/11",
      studyHours: 0,
      studyMinutes: 0,
      completedLessons: 0,
      today: false,
    },
    {
      date: "2026-11-15",
      label: "CN",
      fullLabel: "Chủ nhật, 15/11",
      studyHours: 0,
      studyMinutes: 0,
      completedLessons: 0,
      today: false,
    },
  ],
  windowDailyActivity: [
    {
      date: "2026-11-06",
      label: "06/11",
      fullLabel: "Thứ 6, 06/11",
      studyHours: 2.0,
      studyMinutes: 120,
      completedLessons: 0,
      today: false,
    },
    {
      date: "2026-11-12",
      label: "12/11",
      fullLabel: "Thứ 5, 12/11",
      studyHours: 1.0,
      studyMinutes: 60,
      completedLessons: 1,
      today: true,
    },
  ],
  scoreTrend: [
    {
      itemId: "q-1",
      title: "Quiz 1: Nền tảng",
      assessmentType: "QUIZ",
      courseId: "c-1",
      courseTitle: "Phân tích Dữ liệu Python",
      scoreOutOf10: 9.0,
      passed: true,
      recordedAt: "2026-11-10T10:00:00Z",
    },
    {
      itemId: "q-2",
      title: "Quiz 2: Thống kê",
      assessmentType: "QUIZ",
      courseId: "c-1",
      courseTitle: "Phân tích Dữ liệu Python",
      scoreOutOf10: 5.0,
      passed: false,
      recordedAt: "2026-11-11T10:00:00Z",
    },
  ],
  coursePerformances: [
    {
      courseId: "c-1",
      courseTitle: "Phân tích Dữ liệu Python",
      courseSlug: "python-data",
      totalLessons: 10,
      completedLessons: 6,
      completionPercent: 60,
      bestQuizAverageOutOf10: 7.0,
      attemptedQuizzesCount: 2,
      totalQuizzesCount: 2,
      passedQuizzesCount: 1,
      assignmentAverageOutOf10: 8.5,
      submittedAssignmentsCount: 2,
      totalAssignmentsCount: 2,
      lastActivityAt: "2026-11-12T08:00:00Z",
    },
  ],
  focusItems: [
    {
      id: "quiz-q-2",
      type: "FAILED_QUIZ",
      priority: "HIGH",
      title: "Quiz 2: Thống kê",
      description: "Điểm cao nhất 5.0/10 · Cần đạt 7.0/10 (2 lần làm)",
      courseId: "c-1",
      courseTitle: "Phân tích Dữ liệu Python",
      actionHref: "/learning/lessons/lesson-q2",
      actionLabel: "Làm lại quiz",
    },
  ],
};

describe("StudentAnalyticsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getAccessToken.mockResolvedValue("test-token");
  });

  it("renders KPIs, score trend chart, focus items, switches to 30 days, and expands course details", async () => {
    const user = userEvent.setup();
    const fetchOverviewSpy = vi
      .spyOn(studentAnalyticsClient, "fetchStudentLearningAnalytics")
      .mockResolvedValue(sampleOverview7);
    const fetchCourseSpy = vi
      .spyOn(studentAnalyticsClient, "fetchStudentCourseAnalytics")
      .mockResolvedValue({
        course: sampleOverview7.coursePerformances[0],
        quizzes: [
          {
            quizId: "q-2",
            lessonId: "lesson-q2",
            lessonTitle: "Quiz 2: Thống kê",
            sectionTitle: "Chương 2",
            passingScoreOutOf10: 7.0,
            bestScoreOutOf10: 5.0,
            latestScoreOutOf10: 5.0,
            passed: false,
            attemptCount: 2,
            lastAttemptAt: "2026-11-11T10:00:00Z",
          },
        ],
        assignments: [
          {
            assignmentId: "a-2",
            title: "Bài tập Pandas",
            dueAt: "2026-11-20T10:00:00Z",
            maxScore: 10,
            submitted: true,
            submittedAt: "2026-11-11T12:00:00Z",
            late: false,
            rawScore: null,
            scoreOutOf10: null,
            gradedAt: null,
          },
        ],
        focusItems: sampleOverview7.focusItems,
      });

    render(<StudentAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("7.5/10")).toBeInTheDocument();
    });

    expect(screen.getAllByText("60%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Kỷ lục dài nhất: 9 ngày")).toBeInTheDocument();
    expect(screen.getByText("Quiz 2: Thống kê")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Làm lại quiz" })).toHaveAttribute(
      "href",
      "/learning/lessons/lesson-q2",
    );
    expect(
      screen.getByRole("img", { name: "Biểu đồ xu hướng điểm số trên thang 10" }),
    ).toBeInTheDocument();

    // Switch window to 30 days
    await user.click(screen.getByRole("button", { name: "30 ngày gần nhất" }));
    await waitFor(() => {
      expect(fetchOverviewSpy).toHaveBeenCalledWith("test-token", 30);
    });

    // Expand course detail drawer
    await user.click(screen.getByRole("button", { name: /Xem chi tiết/i }));
    await waitFor(() => {
      expect(fetchCourseSpy).toHaveBeenCalledWith("test-token", "c-1");
      expect(screen.getByText("Bài tập Pandas")).toBeInTheDocument();
      expect(screen.getByText("Chờ chấm")).toBeInTheDocument();
      expect(screen.getByText("Chưa đạt")).toBeInTheDocument();
    });
  });

  it("renders polite instructor notice when STUDENT_REQUIRED is returned", async () => {
    vi.spyOn(studentAnalyticsClient, "fetchStudentLearningAnalytics").mockRejectedValue(
      new ApiClientError(403, {
        code: "STUDENT_REQUIRED",
        message: "Chức năng này dành cho tài khoản học viên đang hoạt động",
        details: [],
      }),
    );

    render(<StudentAnalyticsView isInstructor />);

    await waitFor(() => {
      expect(screen.getByText("Tài khoản Giảng viên chưa có hồ sơ học viên")).toBeInTheDocument();
    });
  });

  it("renders friendly empty state when student has no active enrollments", async () => {
    vi.spyOn(studentAnalyticsClient, "fetchStudentLearningAnalytics").mockResolvedValue({
      ...sampleOverview7,
      summary: {
        ...sampleOverview7.summary,
        activeCourseCount: 0,
        totalLessons: 0,
        completedLessons: 0,
      },
      coursePerformances: [],
      focusItems: [],
      scoreTrend: [],
    });

    render(<StudentAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Chưa có dữ liệu phân tích học tập")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Khám phá khóa học/i })).toBeInTheDocument();
    });
  });
});
