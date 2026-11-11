import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLearningTelemetry } from "@/features/learning/use-learning-telemetry";
import * as learningClient from "@/lib/learning-client";
import type { LessonContent } from "@/lib/learning-client";

const textLesson: LessonContent = {
  id: "lesson-text-1",
  courseId: "course-1",
  sectionId: "section-1",
  title: "Bài đọc 1",
  lessonType: "TEXT",
  content: "Nội dung bài đọc",
  description: null,
  objectives: [],
  attachments: [],
};

const videoLesson: LessonContent = {
  id: "lesson-video-2",
  courseId: "course-1",
  sectionId: "section-1",
  title: "Video bài giảng 2",
  lessonType: "VIDEO",
  content: null,
  description: null,
  objectives: [],
  attachments: [],
};

describe("useLearningTelemetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(learningClient, "recordLearningActivity").mockResolvedValue(undefined);
  });

  it("emits LESSON_VIEWED, pauses TEXT dwell tracking on tab hide, and flushes cleanly when switching lessons", async () => {
    let nowMs = 2_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    const getAccessToken = vi.fn().mockResolvedValue("student-token");
    let visibility: DocumentVisibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });

    const { result, rerender } = renderHook(
      ({ lesson, activeLessonKey }: { lesson: LessonContent | null; activeLessonKey: string }) =>
        useLearningTelemetry({ lesson, activeLessonKey, getAccessToken }),
      { initialProps: { lesson: textLesson, activeLessonKey: textLesson.id } },
    );

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

    // Read for 7 seconds then hide tab -> flushes 7s with keepalive
    nowMs += 7_000;
    visibility = "hidden";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenCalledWith(
        "student-token",
        expect.objectContaining({
          lessonId: "lesson-text-1",
          activityType: "LESSON_VIEWED",
          metadata: JSON.stringify({ lesson_type: "TEXT", reading_time_seconds: 7 }),
        }),
        { keepalive: true },
      );
    });

    // Time elapsed while tab hidden (20s) must NOT count; only 6s after visible counts on switch
    nowMs += 20_000;
    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    nowMs += 6_000;

    rerender({ lesson: videoLesson, activeLessonKey: videoLesson.id });

    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenCalledWith(
        "student-token",
        expect.objectContaining({
          lessonId: "lesson-text-1",
          activityType: "LESSON_VIEWED",
          metadata: JSON.stringify({ lesson_type: "TEXT", reading_time_seconds: 6 }),
        }),
        { keepalive: true },
      );
      expect(learningClient.recordLearningActivity).toHaveBeenCalledWith(
        "student-token",
        expect.objectContaining({
          lessonId: "lesson-video-2",
          activityType: "LESSON_VIEWED",
          metadata: JSON.stringify({ lesson_type: "VIDEO" }),
        }),
      );
    });

    // Auto-batch video flush after reaching 60s across continuous ticks
    act(() => {
      result.current.trackVideoPlay(0);
      for (let t = 4; t <= 60; t += 4) {
        result.current.trackVideoTimeUpdate(t);
      }
    });

    await waitFor(() => {
      expect(learningClient.recordLearningActivity).toHaveBeenCalledWith(
        "student-token",
        expect.objectContaining({
          lessonId: "lesson-video-2",
          activityType: "VIDEO_WATCHED",
          metadata: JSON.stringify({ duration_seconds: 60, position_seconds: 60 }),
        }),
        undefined,
      );
    });
  });
});
