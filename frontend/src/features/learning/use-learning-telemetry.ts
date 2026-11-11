"use client";

import { useCallback, useEffect, useRef } from "react";
import { recordLearningActivity, type LessonContent } from "@/lib/learning-client";

const MIN_WATCH_FLUSH_SECONDS = 5;
const VIDEO_BATCH_FLUSH_SECONDS = 60;
const MAX_VIDEO_TICK_DELTA_SECONDS = 5;
const MIN_TEXT_READ_FLUSH_SECONDS = 5;

export type UseLearningTelemetryOptions = {
  lesson: LessonContent | null;
  activeLessonKey: string;
  getAccessToken: () => Promise<string | null>;
};

export function useLearningTelemetry({
  lesson,
  activeLessonKey,
  getAccessToken,
}: UseLearningTelemetryOptions) {
  const lastVideoTimeRef = useRef(0);
  const videoPositionRef = useRef(0);
  const watchSecondsAccumulatorRef = useRef(0);
  const viewedLessonIdRef = useRef<string | null>(null);
  const textReadStartedAtRef = useRef<number | null>(null);
  const textReadAccumulatedMsRef = useRef(0);
  const latestLessonRef = useRef<LessonContent | null>(null);
  const latestGetAccessTokenRef = useRef(getAccessToken);
  const latestAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    latestLessonRef.current = lesson;
    latestGetAccessTokenRef.current = getAccessToken;
  }, [lesson, getAccessToken]);

  const primeAccessToken = useCallback((token: string | null | undefined) => {
    if (token) {
      latestAccessTokenRef.current = token;
    }
  }, []);

  const resolveToken = useCallback(async (preferCached = false) => {
    if (preferCached && latestAccessTokenRef.current) {
      return latestAccessTokenRef.current;
    }
    const token = await latestGetAccessTokenRef.current();
    if (token) {
      latestAccessTokenRef.current = token;
    }
    return token;
  }, []);

  const flushVideoWatchTime = useCallback(
    async (useKeepalive = false) => {
      const currentLesson = latestLessonRef.current;
      const seconds = watchSecondsAccumulatorRef.current;
      if (!currentLesson || seconds < MIN_WATCH_FLUSH_SECONDS) return;
      const durationSeconds = Math.round(seconds);
      const positionSeconds = Math.round(videoPositionRef.current);
      watchSecondsAccumulatorRef.current = 0;
      try {
        const token = await resolveToken(useKeepalive);
        if (!token) return;
        await recordLearningActivity(
          token,
          {
            courseId: currentLesson.courseId,
            sectionId: currentLesson.sectionId,
            lessonId: currentLesson.id,
            activityType: "VIDEO_WATCHED",
            metadata: JSON.stringify({
              duration_seconds: durationSeconds,
              position_seconds: positionSeconds,
            }),
          },
          useKeepalive ? { keepalive: true } : undefined,
        );
      } catch {
        // Bỏ qua lỗi telemetry nền để không làm gián đoạn trải nghiệm học tập
      }
    },
    [resolveToken],
  );

  const flushTextReadingTime = useCallback(
    async (useKeepalive = false) => {
      const currentLesson = latestLessonRef.current;
      if (!currentLesson || currentLesson.lessonType !== "TEXT") {
        textReadAccumulatedMsRef.current = 0;
        textReadStartedAtRef.current = null;
        return;
      }
      if (textReadStartedAtRef.current !== null) {
        textReadAccumulatedMsRef.current += Math.max(0, Date.now() - textReadStartedAtRef.current);
        textReadStartedAtRef.current =
          typeof document !== "undefined" && document.visibilityState === "visible"
            ? Date.now()
            : null;
      }
      const seconds = Math.round(textReadAccumulatedMsRef.current / 1000);
      if (seconds < MIN_TEXT_READ_FLUSH_SECONDS) return;
      textReadAccumulatedMsRef.current = 0;
      try {
        const token = await resolveToken(useKeepalive);
        if (!token) return;
        await recordLearningActivity(
          token,
          {
            courseId: currentLesson.courseId,
            sectionId: currentLesson.sectionId,
            lessonId: currentLesson.id,
            activityType: "LESSON_VIEWED",
            metadata: JSON.stringify({
              lesson_type: "TEXT",
              reading_time_seconds: seconds,
            }),
          },
          useKeepalive ? { keepalive: true } : undefined,
        );
      } catch {
        // Bỏ qua lỗi telemetry nền để không làm gián đoạn trải nghiệm học tập
      }
    },
    [resolveToken],
  );

  useEffect(() => {
    if (!lesson || viewedLessonIdRef.current === lesson.id) {
      return;
    }
    viewedLessonIdRef.current = lesson.id;
    let cancelled = false;
    const payload = {
      courseId: lesson.courseId,
      sectionId: lesson.sectionId,
      lessonId: lesson.id,
      activityType: "LESSON_VIEWED",
      metadata: JSON.stringify({ lesson_type: lesson.lessonType }),
    };

    const cachedToken = latestAccessTokenRef.current;
    if (cachedToken) {
      void recordLearningActivity(cachedToken, payload).catch(() => undefined);
      return;
    }

    void resolveToken(false)
      .then((token) => (cancelled || !token ? undefined : recordLearningActivity(token, payload)))
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [lesson, resolveToken]);

  useEffect(() => {
    if (!lesson || lesson.lessonType !== "TEXT") {
      textReadAccumulatedMsRef.current = 0;
      textReadStartedAtRef.current = null;
      return;
    }
    textReadAccumulatedMsRef.current = 0;
    textReadStartedAtRef.current =
      typeof document === "undefined" || document.visibilityState === "visible" ? Date.now() : null;
    return () => {
      void flushTextReadingTime(true);
      textReadAccumulatedMsRef.current = 0;
      textReadStartedAtRef.current = null;
    };
  }, [lesson, flushTextReadingTime]);

  useEffect(() => {
    const handlePageHide = () => {
      void flushVideoWatchTime(true);
      void flushTextReadingTime(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushVideoWatchTime(true);
        void flushTextReadingTime(true);
      } else if (
        document.visibilityState === "visible" &&
        latestLessonRef.current?.lessonType === "TEXT" &&
        textReadStartedAtRef.current === null
      ) {
        textReadStartedAtRef.current = Date.now();
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void flushVideoWatchTime(true);
      void flushTextReadingTime(true);
      watchSecondsAccumulatorRef.current = 0;
      lastVideoTimeRef.current = 0;
      videoPositionRef.current = 0;
    };
  }, [activeLessonKey, flushVideoWatchTime, flushTextReadingTime]);

  const trackVideoPlay = useCallback((currentTime: number) => {
    lastVideoTimeRef.current = currentTime;
    videoPositionRef.current = currentTime;
  }, []);

  const trackVideoTimeUpdate = useCallback(
    (currentTime: number) => {
      const delta = currentTime - lastVideoTimeRef.current;
      lastVideoTimeRef.current = currentTime;
      videoPositionRef.current = currentTime;
      if (delta > 0 && delta < MAX_VIDEO_TICK_DELTA_SECONDS) {
        watchSecondsAccumulatorRef.current += delta;
        if (watchSecondsAccumulatorRef.current >= VIDEO_BATCH_FLUSH_SECONDS) {
          void flushVideoWatchTime();
        }
      }
    },
    [flushVideoWatchTime],
  );

  const trackVideoPause = useCallback(() => {
    void flushVideoWatchTime();
  }, [flushVideoWatchTime]);

  const trackVideoEnded = useCallback(() => {
    void flushVideoWatchTime();
  }, [flushVideoWatchTime]);

  const trackResourceDownload = useCallback(
    (attachmentId: string, fileName?: string | null, tokenOverride?: string | null) => {
      const currentLesson = latestLessonRef.current;
      if (!currentLesson) return;
      const payload = {
        courseId: currentLesson.courseId,
        sectionId: currentLesson.sectionId,
        lessonId: currentLesson.id,
        activityType: "RESOURCE_DOWNLOADED",
        metadata: JSON.stringify({
          attachment_id: attachmentId,
          file_name: fileName ?? null,
        }),
      };
      if (tokenOverride) {
        latestAccessTokenRef.current = tokenOverride;
        void recordLearningActivity(tokenOverride, payload).catch(() => undefined);
        return;
      }
      void resolveToken(false)
        .then((token) => (token ? recordLearningActivity(token, payload) : undefined))
        .catch(() => undefined);
    },
    [resolveToken],
  );

  const flushBeforeComplete = useCallback(
    (targetLessonId?: string) => {
      if (targetLessonId && latestLessonRef.current?.id !== targetLessonId) {
        return;
      }
      void flushVideoWatchTime();
      void flushTextReadingTime();
    },
    [flushTextReadingTime, flushVideoWatchTime],
  );

  return {
    primeAccessToken,
    trackVideoPlay,
    trackVideoTimeUpdate,
    trackVideoPause,
    trackVideoEnded,
    trackResourceDownload,
    flushBeforeComplete,
  };
}
