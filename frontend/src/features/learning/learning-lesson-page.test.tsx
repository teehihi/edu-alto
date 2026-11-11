import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningLessonPage } from "./learning-lesson-page";
import * as learningClient from "@/lib/learning-client";

const getAccessToken = vi.fn().mockResolvedValue("student-token");
const mockRouter = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams("courseId=course-1"),
}));

vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => <div /> }));
vi.mock("@/features/learning/learning-workspace-shell", () => ({
  LearningWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
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
      description: null,
      objectives: [],
      attachments: [],
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
    vi.spyOn(learningClient, "recordLearningActivity").mockResolvedValue(undefined);
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

  it("accumulates video watch time and flushes telemetry on pause and unmount without spurious flushes", async () => {
    const { unmount } = render(<LearningLessonPage lessonId="lesson-video-1" />);

    const player = (await screen.findByLabelText(
      "Video bài học: Giới thiệu bài học video",
    )) as HTMLVideoElement;

    // LESSON_VIEWED was already emitted when the lesson loaded
    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenCalledWith(
        "student-token",
        expect.objectContaining({
          courseId: "course-1",
          sectionId: "section-1",
          lessonId: "lesson-video-1",
          activityType: "LESSON_VIEWED",
          metadata: JSON.stringify({ lesson_type: "VIDEO" }),
        }),
      );
    });

    // Simulate playback deltas (total 8 seconds across 3 ticks)
    player.currentTime = 0;
    fireEvent.play(player);
    player.currentTime = 4;
    fireEvent.timeUpdate(player);
    player.currentTime = 8;
    fireEvent.timeUpdate(player);

    // Pause flushes 8s of watch time
    fireEvent.pause(player);
    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenCalledTimes(2);
    });
    expect(learningClient.recordLearningActivity).toHaveBeenCalledWith(
      "student-token",
      expect.objectContaining({
        courseId: "course-1",
        sectionId: "section-1",
        lessonId: "lesson-video-1",
        activityType: "VIDEO_WATCHED",
        metadata: JSON.stringify({ duration_seconds: 8, position_seconds: 8 }),
      }),
      undefined,
    );

    // Accumulate another 6s and unmount -> flushes with keepalive: true
    fireEvent.play(player);
    player.currentTime = 11;
    fireEvent.timeUpdate(player);
    player.currentTime = 14;
    fireEvent.timeUpdate(player);
    unmount();

    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenCalledTimes(3);
    });
    expect(learningClient.recordLearningActivity).toHaveBeenLastCalledWith(
      "student-token",
      expect.objectContaining({
        activityType: "VIDEO_WATCHED",
        metadata: JSON.stringify({ duration_seconds: 6, position_seconds: 14 }),
      }),
      { keepalive: true },
    );
  });

  it("tracks TEXT reading time and attachment download telemetry", async () => {
    const user = userEvent.setup();
    let nowMs = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    vi.spyOn(learningClient, "fetchLearningLesson").mockResolvedValue({
      id: "lesson-text-1",
      courseId: "course-1",
      sectionId: "section-1",
      title: "Bài đọc kiến trúc",
      lessonType: "TEXT",
      content: "Nội dung chi tiết bài đọc.",
      description: null,
      objectives: [],
      attachments: [
        {
          id: "att-1",
          fileName: "slide-bai-1.pdf",
          contentType: "application/pdf",
          contentLength: 1024,
          visibleToStudents: true,
        },
      ],
    });
    vi.spyOn(learningClient, "fetchLessonResourceDownload").mockResolvedValue({
      attachmentId: "att-1",
      downloadUrl: "https://media.example/slide-bai-1.pdf",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
    });
    vi.spyOn(learningClient, "triggerResourceDownload").mockImplementation(() => undefined);

    const { unmount } = render(<LearningLessonPage lessonId="lesson-text-1" />);

    const downloadBtn = await screen.findByRole("button", { name: "Tải xuống" });
    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenCalledWith(
        "student-token",
        expect.objectContaining({
          lessonId: "lesson-text-1",
          activityType: "LESSON_VIEWED",
          metadata: JSON.stringify({ lesson_type: "TEXT" }),
        }),
      );
    });

    await user.click(downloadBtn);
    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenCalledWith(
        "student-token",
        expect.objectContaining({
          lessonId: "lesson-text-1",
          activityType: "RESOURCE_DOWNLOADED",
          metadata: JSON.stringify({
            attachment_id: "att-1",
            file_name: "slide-bai-1.pdf",
          }),
        }),
      );
    });

    // Advance 12 seconds of active visible reading and unmount
    nowMs += 12_000;
    unmount();

    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenLastCalledWith(
        "student-token",
        expect.objectContaining({
          lessonId: "lesson-text-1",
          activityType: "LESSON_VIEWED",
          metadata: JSON.stringify({
            lesson_type: "TEXT",
            reading_time_seconds: 12,
          }),
        }),
        { keepalive: true },
      );
    });
  });
});
