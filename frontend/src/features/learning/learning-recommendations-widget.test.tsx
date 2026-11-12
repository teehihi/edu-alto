import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningRecommendationsWidget } from "./learning-recommendations-widget";
import * as recommendationClient from "@/lib/recommendation-client";

const getAccessToken = vi.fn().mockResolvedValue("test-token");

vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => ({
    user: { id: "user-1", fullName: "Lê Minh", roles: ["STUDENT"] },
    isLoading: false,
    getAccessToken,
  }),
}));

describe("LearningRecommendationsWidget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getAccessToken.mockResolvedValue("test-token");
  });

  it("renders next-lesson and quiz-review recommendations and dismisses items", async () => {
    vi.spyOn(recommendationClient, "fetchLearningNextRecommendations").mockResolvedValue({
      snapshotId: "snap-learn-1",
      algorithmVersion: "rule-tfidf-v1",
      personalizationEnabled: true,
      generatedAt: "2026-11-12T00:00:00Z",
      items: [
        {
          itemId: "item-next-1",
          itemType: "QUIZ_REVIEW",
          targetId: "les-quiz-1",
          courseId: "course-1",
          courseTitle: "Java & Spring Boot Thực Chiến",
          courseSlug: "java-spring-boot",
          lessonId: "les-quiz-1",
          lessonTitle: "Kiểm tra Dependency Injection",
          sectionTitle: "Chương 2: Spring Core",
          targetUrl: "/learning/courses/course-1?lesson=les-quiz-1",
          actionLabel: "Ôn tập ngay",
          score: 0.98,
          tier: "RULE_GAP",
          reasonCode: "REVIEW_WEAK_QUIZ",
          reasonText: "Điểm cao nhất hiện tại là 55%. Ôn lại để nắm chắc kiến thức.",
          estimatedMinutes: 15,
          completedLessons: 4,
          totalLessons: 10,
        },
      ],
    });
    vi.spyOn(recommendationClient, "fetchCourseRecommendations").mockResolvedValue({
      snapshotId: "snap-course-1",
      algorithmVersion: "rule-tfidf-v1",
      personalized: true,
      personalizationEnabled: true,
      onboardingCompleted: true,
      generatedAt: "2026-11-12T00:00:00Z",
      items: [
        {
          id: "course-2",
          slug: "spring-security-jwt",
          title: "Bảo mật Spring Security & JWT",
          tagline: "Xây dựng Auth thực tế",
          thumbnailUrl: null,
          price: 499000,
          originalPrice: 699000,
          level: "INTERMEDIATE",
          language: "vi",
          status: "PUBLISHED",
          publishedAt: "2026-10-10T00:00:00Z",
          instructor: {
            id: "inst-1",
            fullName: "Nguyễn Hải",
            avatarUrl: null,
            headline: null,
            customHandle: null,
          },
          itemId: "item-course-1",
          score: 0.89,
          tier: "TFIDF_SIMILARITY",
          reasonCode: "MATCH_PREFERRED_TOPIC",
          reasonText: "Phù hợp chủ đề Java & Spring Boot bạn quan tâm",
        },
      ],
    });
    vi.spyOn(recommendationClient, "fetchLearningPreferences").mockResolvedValue({
      preferredTopics: ["Java & Spring Boot"],
      preferredLevel: "INTERMEDIATE",
      learningGoal: "Backend Developer",
      weeklyTargetHours: 6,
      personalizationEnabled: true,
      onboardingCompleted: true,
      suggestedTopics: ["Java & Spring Boot", "React & Next.js"],
    });
    const feedbackSpy = vi
      .spyOn(recommendationClient, "submitRecommendationFeedback")
      .mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<LearningRecommendationsWidget hasEnrollments />);

    expect(await screen.findByText("Kiểm tra Dependency Injection")).toBeInTheDocument();
    expect(
      screen.getByText("Điểm cao nhất hiện tại là 55%. Ôn lại để nắm chắc kiến thức."),
    ).toBeInTheDocument();
    expect(screen.getByText("Bảo mật Spring Security & JWT")).toBeInTheDocument();
    expect(screen.getByText("Phù hợp chủ đề Java & Spring Boot bạn quan tâm")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Ẩn gợi ý Kiểm tra Dependency Injection" }),
    );

    await waitFor(() => {
      expect(feedbackSpy).toHaveBeenCalledWith("test-token", {
        snapshotId: "snap-learn-1",
        recommendationItemId: "item-next-1",
        targetType: "QUIZ_REVIEW",
        targetId: "les-quiz-1",
        feedbackType: "DISMISSED",
      });
    });
    expect(screen.queryByText("Kiểm tra Dependency Injection")).not.toBeInTheDocument();
  });

  it("allows updating topic preferences and displays opt-out state", async () => {
    vi.spyOn(recommendationClient, "fetchLearningNextRecommendations").mockResolvedValue({
      snapshotId: null,
      algorithmVersion: "rule-tfidf-v1",
      personalizationEnabled: false,
      generatedAt: "2026-11-12T00:00:00Z",
      items: [],
    });
    vi.spyOn(recommendationClient, "fetchCourseRecommendations").mockResolvedValue({
      snapshotId: null,
      algorithmVersion: "rule-tfidf-v1",
      personalized: false,
      personalizationEnabled: false,
      onboardingCompleted: true,
      generatedAt: "2026-11-12T00:00:00Z",
      items: [],
    });
    vi.spyOn(recommendationClient, "fetchLearningPreferences").mockResolvedValue({
      preferredTopics: [],
      preferredLevel: null,
      learningGoal: null,
      weeklyTargetHours: null,
      personalizationEnabled: false,
      onboardingCompleted: true,
      suggestedTopics: ["Lập trình Web", "Cơ sở dữ liệu & SQL"],
    });
    const updateSpy = vi
      .spyOn(recommendationClient, "updateLearningPreferences")
      .mockResolvedValue({
        preferredTopics: ["Lập trình Web"],
        preferredLevel: "BEGINNER",
        learningGoal: "Xây dựng ứng dụng web đầu tiên",
        weeklyTargetHours: null,
        personalizationEnabled: true,
        onboardingCompleted: true,
        suggestedTopics: ["Lập trình Web", "Cơ sở dữ liệu & SQL"],
      });

    const user = userEvent.setup();
    render(<LearningRecommendationsWidget hasEnrollments={false} />);

    expect(
      await screen.findByText("Bạn đang tắt gợi ý cá nhân hóa cho tài khoản này."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sở thích học tập" }));
    await user.click(screen.getByRole("button", { name: "Lập trình Web" }));
    await user.click(screen.getByLabelText("Bật gợi ý cá nhân hóa"));
    await user.type(screen.getByLabelText("Mục tiêu học tập"), "Xây dựng ứng dụng web đầu tiên");
    await user.selectOptions(screen.getByLabelText("Trình độ ưu tiên"), "BEGINNER");
    await user.click(screen.getByRole("button", { name: "Lưu sở thích" }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("test-token", {
        preferredTopics: ["Lập trình Web"],
        preferredLevel: "BEGINNER",
        learningGoal: "Xây dựng ứng dụng web đầu tiên",
        personalizationEnabled: true,
      });
    });
  });

  it("renders polite Vietnamese empty state when no recommendations are available", async () => {
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
      suggestedTopics: ["Lập trình Web"],
    });

    render(<LearningRecommendationsWidget hasEnrollments />);
    expect(await screen.findByText("Chưa có gợi ý học tập phù hợp")).toBeInTheDocument();
  });
});
