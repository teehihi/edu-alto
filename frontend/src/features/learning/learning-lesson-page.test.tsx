import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningLessonPage } from "./learning-lesson-page";
import * as learningClient from "@/lib/learning-client";

const getAccessToken = vi.fn().mockResolvedValue("student-token");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("courseId=course-1"),
}));

vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => <div /> }));
vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => ({
    user: { id: "student-1" },
    isLoading: false,
    getAccessToken,
  }),
}));
vi.mock("@/features/learning/learning-quiz-content", () => ({
  LearningQuizContent: () => <div>Quiz</div>,
}));

describe("LearningLessonPage video playback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getAccessToken.mockResolvedValue("student-token");
    vi.spyOn(learningClient, "fetchLearningLesson").mockResolvedValue({
      id: "lesson-video-1",
      courseId: "course-1",
      sectionId: "section-1",
      title: "Giới thiệu bài học video",
      lessonType: "VIDEO",
      content: "Nội dung bổ sung cho video.",
    });
    vi.spyOn(learningClient, "fetchSavedLessons").mockResolvedValue({
      data: [],
      meta: { page: 0, size: 20, totalElements: 0, totalPages: 0 },
    });
    vi.spyOn(learningClient, "fetchLessonVideoAccess").mockResolvedValue({
      lessonId: "lesson-video-1",
      videoUrl: "https://media.example/video-1?signature=one",
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
  });

  it("loads the authenticated signed playback URL into a responsive video player", async () => {
    render(<LearningLessonPage lessonId="lesson-video-1" />);

    const player = await screen.findByLabelText("Video bài học: Giới thiệu bài học video");
    expect(player).toHaveAttribute("src", "https://media.example/video-1?signature=one");
    expect(learningClient.fetchLessonVideoAccess).toHaveBeenCalledWith(
      "student-token",
      "lesson-video-1",
    );
  });

  it("offers a retry if the signed link cannot be renewed and recovers with a fresh URL", async () => {
    const user = userEvent.setup();
    vi.mocked(learningClient.fetchLessonVideoAccess)
      .mockReset()
      .mockRejectedValueOnce(new Error("Kết nối bị gián đoạn"))
      .mockResolvedValue({
        lessonId: "lesson-video-1",
        videoUrl: "https://media.example/video-1?signature=fresh",
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
    render(<LearningLessonPage lessonId="lesson-video-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Kết nối bị gián đoạn");
    const retryButtonName = /^(Tải lại video|Làm mới liên kết)$/;
    await waitFor(() =>
      expect(screen.getByRole("button", { name: retryButtonName })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: retryButtonName }));

    await waitFor(() => {
      expect(screen.getByLabelText("Video bài học: Giới thiệu bài học video")).toHaveAttribute(
        "src",
        "https://media.example/video-1?signature=fresh",
      );
    });
  });
});
