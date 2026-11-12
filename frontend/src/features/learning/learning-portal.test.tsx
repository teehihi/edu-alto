import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningPortal } from "./learning-portal";
import { clearQueryClient } from "@/lib/query-provider";
import * as learningClient from "@/lib/learning-client";
import * as instructorCourseClient from "@/lib/instructor-course-client";
import * as studentAnalyticsClient from "@/lib/student-analytics-client";
import * as recommendationClient from "@/lib/recommendation-client";
import { ApiClientError } from "@/lib/api";

const getAccessToken = vi.fn().mockResolvedValue("test-token");
const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
let mockUser: { id: string; fullName: string; roles: string[] } | null = {
  id: "instructor-1",
  fullName: "Nguyễn Minh Anh",
  roles: ["INSTRUCTOR"],
};

const {
  fetchMyCertificatesMock,
  fetchStudentConversationsMock,
  fetchStudentMessagesMock,
  sendStudentMessageMock,
  startStudentConversationMock,
  connectRealtimeMessagingMock,
  fetchUserPresenceMock,
  fetchMyCourseReviewMock,
  saveCourseReviewMock,
  fetchPublicInstructorPageMock,
  fetchPublicCourseBySlugMock,
  fetchCourseDiscussionsMock,
  fetchDiscussionDetailMock,
  addDiscussionCommentMock,
} = vi.hoisted(() => ({
  fetchMyCertificatesMock: vi.fn(),
  fetchStudentConversationsMock: vi.fn(),
  fetchStudentMessagesMock: vi.fn(),
  sendStudentMessageMock: vi.fn(),
  startStudentConversationMock: vi.fn(),
  connectRealtimeMessagingMock: vi.fn(() => vi.fn()),
  fetchUserPresenceMock: vi.fn().mockResolvedValue([]),
  fetchMyCourseReviewMock: vi.fn(),
  saveCourseReviewMock: vi.fn(),
  fetchPublicInstructorPageMock: vi.fn(),
  fetchPublicCourseBySlugMock: vi.fn(),
  fetchCourseDiscussionsMock: vi.fn(),
  fetchDiscussionDetailMock: vi.fn(),
  addDiscussionCommentMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock, push: routerPushMock }),
  usePathname: () => "/learning/courses",
}));

vi.mock("@/lib/certificate-client", () => ({
  fetchMyCertificates: fetchMyCertificatesMock,
}));

vi.mock("@/lib/student-messaging-client", () => ({
  fetchStudentConversations: fetchStudentConversationsMock,
  fetchStudentMessages: fetchStudentMessagesMock,
  sendStudentMessage: sendStudentMessageMock,
  startStudentConversation: startStudentConversationMock,
}));

vi.mock("@/lib/realtime-messaging-client", () => ({
  connectRealtimeMessaging: connectRealtimeMessagingMock,
  fetchUserPresence: fetchUserPresenceMock,
}));

vi.mock("@/lib/review-client", () => ({
  fetchMyCourseReview: fetchMyCourseReviewMock,
  saveCourseReview: saveCourseReviewMock,
}));

vi.mock("@/lib/instructor-client", () => ({
  fetchPublicInstructorPage: fetchPublicInstructorPageMock,
}));

vi.mock("@/lib/course-client", () => ({
  fetchPublicCourseBySlug: fetchPublicCourseBySlugMock,
}));

vi.mock("@/lib/discussion-client", () => ({
  fetchCourseDiscussions: fetchCourseDiscussionsMock,
  fetchDiscussionDetail: fetchDiscussionDetailMock,
  addDiscussionComment: addDiscussionCommentMock,
  updateDiscussionStatus: vi.fn(),
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
    clearQueryClient();
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

    // Mock student enrollments & batch progress failing with STUDENT_REQUIRED (403)
    vi.spyOn(learningClient, "fetchMyEnrollments").mockRejectedValue(
      new ApiClientError(403, {
        code: "STUDENT_REQUIRED",
        message: "Chức năng này dành cho tài khoản học viên đang hoạt động",
        details: [],
      }),
    );
    vi.spyOn(learningClient, "fetchBatchCourseProgress").mockRejectedValue(
      new ApiClientError(403, {
        code: "STUDENT_REQUIRED",
        message: "Chức năng này dành cho tài khoản học viên đang hoạt động",
        details: [],
      }),
    );

    vi.spyOn(recommendationClient, "fetchLearningNextRecommendations").mockResolvedValue({
      snapshotId: null,
      algorithmVersion: "rule-tfidf-v1",
      personalizationEnabled: true,
      generatedAt: "2026-11-12T00:00:00Z",
      items: [],
    });
    vi.spyOn(recommendationClient, "fetchCourseRecommendations").mockResolvedValue({
      snapshotId: null,
      algorithmVersion: "rule-tfidf-v1",
      personalized: false,
      personalizationEnabled: true,
      onboardingCompleted: true,
      generatedAt: "2026-11-12T00:00:00Z",
      items: [],
    });
    vi.spyOn(recommendationClient, "fetchLearningPreferences").mockResolvedValue({
      preferredTopics: [],
      preferredLevel: null,
      learningGoal: null,
      weeklyTargetHours: null,
      personalizationEnabled: true,
      onboardingCompleted: true,
      suggestedTopics: ["Lập trình Web", "Java & Spring Boot"],
    });
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

    const batchProgressSpy = vi
      .spyOn(learningClient, "fetchBatchCourseProgress")
      .mockResolvedValue([
        {
          courseId: "c-1",
          totalLessons: 12,
          completedLessons: 6,
          progressPercent: 50,
          completed: false,
        },
      ]);
    const singleProgressSpy = vi.spyOn(learningClient, "fetchCourseProgress");

    vi.spyOn(studentAnalyticsClient, "fetchStudentLearningAnalytics").mockResolvedValue({
      windowDays: 7,
      summary: {
        activeCourseCount: 1,
        totalLessons: 12,
        completedLessons: 6,
        completionRate: 50,
        overallAverageScoreOutOf10: 8.5,
        averageQuizScoreOutOf10: 8.5,
        quizPassRate: 100,
        attemptedQuizzesCount: 1,
        passedQuizzesCount: 1,
        averageAssignmentScoreOutOf10: null,
        publishedAssignmentsCount: 0,
        submittedAssignmentsCount: 0,
        onTimeAssignmentsCount: 0,
        currentStreakDays: 4,
        longestStreakDays: 6,
        activeDaysInWindow: 4,
        estimatedStudyHoursInWindow: 3.5,
        completedLessonsInWindow: 3,
        currentWeekHours: 3.5,
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
          studyHours: 0.5,
          studyMinutes: 30,
          completedLessons: 0,
          today: false,
        },
        {
          date: "2026-11-12",
          label: "T5",
          fullLabel: "Thứ 5, 12/11",
          studyHours: 0.5,
          studyMinutes: 30,
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
      windowDailyActivity: [],
      scoreTrend: [],
      coursePerformances: [],
      focusItems: [
        {
          id: "quiz-q-1",
          type: "FAILED_QUIZ",
          priority: "HIGH",
          title: "Quiz 2: App Router",
          description: "Điểm cao nhất 5.0/10 · Cần đạt 7.0/10 (1 lần làm)",
          courseId: "c-1",
          courseTitle: "Next.js Thực Chiến Toàn Diện",
          actionHref: "/learning/lessons/les-2",
          actionLabel: "Làm lại quiz",
        },
      ],
    });

    render(<LearningPortal view="overview" />);

    await waitFor(
      () => {
        expect(screen.getByText("Next.js Thực Chiến Toàn Diện")).toBeInTheDocument();
        expect(screen.getByText(/6\/12 bài học hoàn thành/i)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Tiếp tục học ngay/i })).toBeInTheDocument();
        expect(screen.getByText("Kỷ lục dài nhất: 6 ngày")).toBeInTheDocument();
        expect(screen.getByText("4/7 ngày")).toBeInTheDocument();
        expect(screen.getByText("Quiz 2: App Router")).toBeInTheDocument();
        expect(screen.queryByText("Ôn tập kiến thức tuần này")).not.toBeInTheDocument();
        expect(screen.queryByText("75%")).not.toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    expect(batchProgressSpy).toHaveBeenCalledTimes(1);
    expect(singleProgressSpy).not.toHaveBeenCalled();
  });
});

describe("LearningPortal student portal views", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    clearQueryClient();
    mockUser = {
      id: "student-1",
      fullName: "Trần Bảo Ngọc",
      roles: ["STUDENT"],
    };
    getAccessToken.mockResolvedValue("student-token");
    connectRealtimeMessagingMock.mockReturnValue(vi.fn());
    fetchUserPresenceMock.mockResolvedValue([]);
  });

  it("renders CertificateListView on view=certificates using fetchMyCertificates", async () => {
    fetchMyCertificatesMock.mockResolvedValue([
      {
        id: "cert-1",
        courseId: "course-1",
        courseTitle: "Kiến trúc Spring Boot Thực Chiến",
        certificateNumber: "EA-2026-0001",
        issuedAt: "2026-10-01T00:00:00Z",
      },
    ]);

    render(<LearningPortal view="certificates" />);

    expect(await screen.findByText("Kiến trúc Spring Boot Thực Chiến")).toBeInTheDocument();
    expect(screen.getByText("EA-2026-0001")).toBeInTheDocument();
    expect(fetchMyCertificatesMock).toHaveBeenCalledWith("student-token");
  });

  it("wires view=messages to student conversations without hardcoded dummy names", async () => {
    const user = userEvent.setup();
    fetchStudentConversationsMock.mockResolvedValue({
      data: [
        {
          id: "conv-1",
          instructorId: "inst-1",
          instructorName: "Giảng viên Phạm Quang Huy",
          studentId: "student-1",
          studentName: "Trần Bảo Ngọc",
          lastMessage: "Chào bạn, bài tập tuần này đã mở rồi nhé.",
          lastMessageAt: "2026-11-12T08:00:00Z",
          unreadCount: 1,
          blocked: false,
        },
      ],
      meta: { page: 0, size: 50, totalElements: 1, totalPages: 1 },
    });
    fetchStudentMessagesMock.mockResolvedValue({
      data: [
        {
          id: "msg-1",
          senderId: "inst-1",
          body: "Chào bạn, bài tập tuần này đã mở rồi nhé.",
          createdAt: "2026-11-12T08:00:00Z",
          readAt: null,
        },
      ],
      meta: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
    });
    sendStudentMessageMock.mockResolvedValue({
      id: "msg-2",
      senderId: "student-1",
      body: "Dạ em cảm ơn thầy ạ!",
      createdAt: "2026-11-12T08:05:00Z",
      readAt: null,
    });

    render(<LearningPortal view="messages" />);

    expect(await screen.findAllByText("Giảng viên Phạm Quang Huy")).not.toHaveLength(0);
    expect(screen.queryByText("Lê Quốc Khánh")).not.toBeInTheDocument();
    expect(screen.queryByText("Thầy Hoàng Văn Dũng")).not.toBeInTheDocument();

    const input = await screen.findByLabelText("Nhập tin nhắn");
    await user.type(input, "Dạ em cảm ơn thầy ạ!");
    await user.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await waitFor(() => {
      expect(sendStudentMessageMock).toHaveBeenCalledWith(
        "conv-1",
        "Dạ em cảm ơn thầy ạ!",
        "student-token",
      );
    });
  });

  it("handles 404 unreviewed courses gracefully and saves reviews on view=reviews", async () => {
    const user = userEvent.setup();
    vi.spyOn(learningClient, "fetchMyEnrollments").mockResolvedValue({
      data: [
        {
          id: "en-1",
          courseId: "c-1",
          courseTitle: "React & TypeScript Chuyên Sâu",
          courseSlug: "react-ts",
          courseStatus: "PUBLISHED",
          status: "ACTIVE",
          enrolledAt: "2026-10-01T00:00:00Z",
        },
      ],
      meta: { page: 0, size: 50, totalElements: 1, totalPages: 1 },
    });
    fetchMyCourseReviewMock.mockRejectedValue(
      new ApiClientError(404, {
        code: "REVIEW_NOT_FOUND",
        message: "Bạn chưa gửi đánh giá cho khóa học này",
        details: [],
      }),
    );
    saveCourseReviewMock.mockResolvedValue({
      id: "rev-1",
      courseId: "c-1",
      studentId: "student-1",
      studentName: "Trần Bảo Ngọc",
      rating: 4,
      comment: "Khóa học dễ hiểu và thực tế.",
      status: "PUBLISHED",
      createdAt: "2026-11-12T09:00:00Z",
      updatedAt: "2026-11-12T09:00:00Z",
    });

    render(<LearningPortal view="reviews" />);

    expect(await screen.findByText("React & TypeScript Chuyên Sâu")).toBeInTheDocument();
    expect(screen.getByText("Chưa có đánh giá")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Chọn 4 sao/i }));
    await user.type(screen.getByLabelText("Nhận xét của bạn"), "Khóa học dễ hiểu và thực tế.");
    await user.click(screen.getByRole("button", { name: "Gửi đánh giá" }));

    await waitFor(() => {
      expect(saveCourseReviewMock).toHaveBeenCalledWith(
        "student-token",
        "c-1",
        4,
        "Khóa học dễ hiểu và thực tế.",
      );
    });
    expect(await screen.findByText("Đã gửi đánh giá thành công.")).toBeInTheDocument();
  });

  it("supports sort and scope filter on view=notes", async () => {
    const user = userEvent.setup();
    vi.spyOn(learningClient, "fetchMyNotes").mockResolvedValue({
      data: [
        {
          id: "n-1",
          title: "Zustand State",
          content: "Ghi chú gắn bài học",
          lessonId: "les-1",
          videoSecond: 45,
          createdAt: "2026-11-10T00:00:00Z",
          updatedAt: "2026-11-10T00:00:00Z",
        },
        {
          id: "n-2",
          title: "Alpha Checklist",
          content: "Ghi chú tổng quan",
          lessonId: null,
          videoSecond: null,
          createdAt: "2026-11-12T00:00:00Z",
          updatedAt: "2026-11-12T00:00:00Z",
        },
      ],
      meta: { page: 0, size: 100, totalElements: 2, totalPages: 1 },
    });

    render(<LearningPortal view="notes" />);

    expect(await screen.findByText("Zustand State")).toBeInTheDocument();
    expect(screen.getByText("Alpha Checklist")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Lọc:/i }));
    await user.click(screen.getByRole("button", { name: "Gắn bài học" }));

    expect(screen.getByText("Zustand State")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Checklist")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Đặt lại" }));
    expect(screen.getByText("Alpha Checklist")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Xếp theo:/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "Tiêu đề A–Z" }));

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Alpha Checklist");
    expect(headings[1]).toHaveTextContent("Zustand State");
  });

  it("renders teachers on view=teachers and starts conversation on submit", async () => {
    const user = userEvent.setup();
    fetchPublicInstructorPageMock.mockResolvedValue({
      data: [
        {
          id: "inst-1",
          fullName: "ThS. Nguyễn Văn An",
          headline: "Kiến trúc sư hệ thống Java",
          bio: null,
          avatarUrl: null,
          xUrl: null,
          linkedinUrl: null,
          websiteUrl: null,
          expertise: "Spring Boot",
          experienceYears: 8,
          teachingExperience: null,
          specialties: "Microservices, PostgreSQL",
        },
      ],
      meta: { page: 0, size: 50, totalElements: 1, totalPages: 1 },
    });
    vi.spyOn(learningClient, "fetchMyEnrollments").mockResolvedValue({
      data: [],
      meta: { page: 0, size: 50, totalElements: 0, totalPages: 0 },
    });
    startStudentConversationMock.mockResolvedValue({
      conversationId: "conv-new",
      message: {
        id: "m-1",
        senderId: "student-1",
        body: "Em chào thầy ạ",
        createdAt: "2026-11-12T10:00:00Z",
        readAt: null,
      },
    });

    render(<LearningPortal view="teachers" />);

    expect(await screen.findByText("ThS. Nguyễn Văn An")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nhắn tin" }));

    await user.type(screen.getByLabelText("Nội dung tin nhắn"), "Em chào thầy ạ");
    await user.click(screen.getByRole("button", { name: "Gửi tin nhắn" }));

    await waitFor(() => {
      expect(startStudentConversationMock).toHaveBeenCalledWith(
        "inst-1",
        "Em chào thầy ạ",
        "student-token",
      );
      expect(routerPushMock).toHaveBeenCalledWith("/learning/messages?conversationId=conv-new");
    });
  });

  it("renders course discussions on view=discussion", async () => {
    vi.spyOn(learningClient, "fetchMyEnrollments").mockResolvedValue({
      data: [
        {
          id: "en-1",
          courseId: "c-1",
          courseTitle: "Java Backend Cơ Bản",
          courseSlug: "java-backend",
          courseStatus: "PUBLISHED",
          status: "ACTIVE",
          enrolledAt: "2026-10-01T00:00:00Z",
        },
      ],
      meta: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
    });
    fetchCourseDiscussionsMock.mockResolvedValue({
      data: [
        {
          id: "disc-1",
          courseId: "c-1",
          lessonId: "les-1",
          authorId: "student-1",
          authorName: "Trần Bảo Ngọc",
          authorAvatarUrl: null,
          authorRole: "STUDENT",
          isCourseInstructor: false,
          title: "Cách cấu hình Flyway trong Spring Boot?",
          body: "Mình gặp lỗi migration khi khởi động ứng dụng.",
          videoTimestampSeconds: 125,
          status: "OPEN",
          commentCount: 1,
          createdAt: "2026-11-12T07:00:00Z",
          updatedAt: "2026-11-12T07:00:00Z",
          canDelete: true,
        },
      ],
      meta: { page: 0, size: 50, totalElements: 1, totalPages: 1 },
    });
    fetchDiscussionDetailMock.mockResolvedValue({
      id: "disc-1",
      courseId: "c-1",
      lessonId: "les-1",
      authorId: "student-1",
      authorName: "Trần Bảo Ngọc",
      authorAvatarUrl: null,
      authorRole: "STUDENT",
      isCourseInstructor: false,
      title: "Cách cấu hình Flyway trong Spring Boot?",
      body: "Mình gặp lỗi migration khi khởi động ứng dụng.",
      videoTimestampSeconds: 125,
      status: "OPEN",
      commentCount: 1,
      createdAt: "2026-11-12T07:00:00Z",
      updatedAt: "2026-11-12T07:00:00Z",
      canDelete: true,
      comments: [
        {
          id: "cmt-1",
          discussionId: "disc-1",
          authorId: "inst-1",
          authorName: "ThS. Nguyễn Văn An",
          authorAvatarUrl: null,
          authorRole: "INSTRUCTOR",
          isCourseInstructor: true,
          body: "Bạn kiểm tra lại tên file V37__... nhé.",
          parentCommentId: null,
          createdAt: "2026-11-12T07:10:00Z",
          canDelete: false,
        },
      ],
    });

    render(<LearningPortal view="discussion" />);

    expect(await screen.findAllByText("Cách cấu hình Flyway trong Spring Boot?")).not.toHaveLength(
      0,
    );
    expect(await screen.findByText("Bạn kiểm tra lại tên file V37__... nhé.")).toBeInTheDocument();
  });
});
