"use client";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  LoaderCircle,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  fetchLearningQuiz,
  startLearningQuiz,
  submitLearningQuiz,
  type LearningQuiz,
  type LearningQuizActivityEvent,
  type LearningQuizAnswer,
  type LearningQuizAttempt,
  type LearningQuizSession,
} from "@/lib/learning-client";

type Props = {
  lessonId: string;
  getAccessToken: () => Promise<string | null>;
  onPassed?: () => void;
};

type QuizDraft = {
  quizId: string;
  sessionId: string;
  answers: Record<string, string>;
  activityEvents: LearningQuizActivityEvent[];
};

export function LearningQuizContent({ lessonId, getAccessToken, onPassed }: Props) {
  const [quiz, setQuiz] = useState<LearningQuiz | null>(null);
  const [session, setSession] = useState<LearningQuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [startError, setStartError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [screen, setScreen] = useState<"intro" | "questions">("intro");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activityEvents, setActivityEvents] = useState<LearningQuizActivityEvent[]>([]);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<LearningQuizAttempt | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const quizLoadRequestId = useRef(0);
  const activeLessonId = useRef(lessonId);
  const storageKeyRef = useRef<string | null>(null);
  const submitInFlight = useRef(false);
  const submitAnswersRef = useRef<(timeExpired?: boolean) => Promise<void>>(async () => {});
  const lastFocusEventAt = useRef(0);
  const timerExpiredSubmit = useRef(false);

  useEffect(() => {
    activeLessonId.current = lessonId;
  }, [lessonId]);

  const loadQuiz = useCallback(async () => {
    const requestId = ++quizLoadRequestId.current;
    setLoading(true);
    setLoadError("");
    setStartError("");
    setQuiz(null);
    setSession(null);
    setAnswers({});
    setActivityEvents([]);
    setAttempt(null);
    setScreen("intro");
    setHasLocalDraft(false);
    storageKeyRef.current = null;
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const result = await fetchLearningQuiz(token, lessonId);
      if (quizLoadRequestId.current !== requestId) return;
      if (!result.questionCount) throw new Error("Bài kiểm tra hiện chưa có câu hỏi.");
      const userId = getTokenSubject(token);
      const key = `edualto:quiz-draft:${userId}:${lessonId}`;
      storageKeyRef.current = key;
      try {
        const draft = readDraft(key);
        setHasLocalDraft(Boolean(draft && draft.quizId === result.id));
      } catch {
        setHasLocalDraft(false);
      }
      setQuiz(result);
    } catch (reason) {
      if (quizLoadRequestId.current !== requestId) return;
      setLoadError(reason instanceof Error ? reason.message : "Chưa thể tải bài kiểm tra.");
    } finally {
      if (quizLoadRequestId.current === requestId) setLoading(false);
    }
  }, [getAccessToken, lessonId]);

  useEffect(() => {
    void loadQuiz();
    return () => {
      quizLoadRequestId.current += 1;
    };
  }, [loadQuiz, retryCount]);

  useEffect(() => {
    if (screen !== "questions" || !session || attempt || !session.expiresAt) {
      setRemainingSeconds(null);
      return;
    }
    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((Date.parse(session.expiresAt!) - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0 && !timerExpiredSubmit.current) {
        timerExpiredSubmit.current = true;
        void submitAnswersRef.current(true);
      }
    };
    updateRemaining();
    const timerId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timerId);
  }, [screen, session, attempt]);

  useEffect(() => {
    if (screen !== "questions" || !session || attempt) return;
    const recordEvent = (eventType: LearningQuizActivityEvent["eventType"]) => {
      const now = Date.now();
      if (eventType === "TAB_HIDDEN" || eventType === "WINDOW_BLUR") {
        if (now - lastFocusEventAt.current < 700) return;
        lastFocusEventAt.current = now;
      }
      setActivityEvents((current) =>
        [...current, { eventType, occurredAt: new Date(now).toISOString() }].slice(-1000),
      );
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") recordEvent("TAB_HIDDEN");
    };
    const handleBlur = () => recordEvent("WINDOW_BLUR");
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [screen, session, attempt]);

  useEffect(() => {
    if (screen !== "questions" || !session || typeof IntersectionObserver === "undefined") return;
    const questionElements = session.questions
      .map((question) => document.getElementById(`quiz-question-${question.id}`))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    if (!questionElements.length) return;

    const visibleQuestions = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleQuestions.add(entry.target);
          else visibleQuestions.delete(entry.target);
        }
        const firstVisible = [...visibleQuestions].sort(
          (first, second) => first.getBoundingClientRect().top - second.getBoundingClientRect().top,
        )[0];
        if (firstVisible instanceof HTMLElement) {
          setCurrentQuestionId(firstVisible.dataset.questionId ?? null);
        }
      },
      { rootMargin: "-160px 0px -60% 0px", threshold: 0 },
    );

    for (const element of questionElements) observer.observe(element);
    return () => observer.disconnect();
  }, [screen, session]);

  useEffect(() => {
    if (!session || !quiz || screen !== "questions" || !storageKeyRef.current) return;
    try {
      window.localStorage.setItem(
        storageKeyRef.current,
        JSON.stringify({
          quizId: quiz.id,
          sessionId: session.id,
          answers,
          activityEvents,
        } satisfies QuizDraft),
      );
      setStartError("");
      setHasLocalDraft(true);
    } catch {
      setStartError("Chưa thể lưu bản nháp trên thiết bị này. Bạn vẫn có thể tiếp tục làm bài.");
    }
  }, [session, quiz, screen, answers, activityEvents]);

  function getUnansweredQuestions() {
    return session?.questions.filter((question) => !answers[question.id]) ?? [];
  }

  async function startAttempt() {
    if (!quiz || starting) return;
    setStarting(true);
    setStartError("");
    setSubmitError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const startedSession = await startLearningQuiz(token, lessonId);
      if (activeLessonId.current !== lessonId) return;
      timerExpiredSubmit.current = false;
      const storedDraft = storageKeyRef.current ? readDraft(storageKeyRef.current) : null;
      const draftToResume =
        storedDraft && storedDraft.quizId === quiz.id && storedDraft.sessionId === startedSession.id
          ? storedDraft
          : null;
      const validAnswers = draftToResume
        ? Object.fromEntries(
            Object.entries(draftToResume.answers).filter(([questionId, optionId]) =>
              startedSession.questions.some(
                (question) =>
                  question.id === questionId &&
                  question.options.some((option) => option.id === optionId),
              ),
            ),
          )
        : {};
      setSession(startedSession);
      setAnswers(validAnswers);
      setActivityEvents(draftToResume?.activityEvents ?? []);
      setHasLocalDraft(Boolean(draftToResume));
      setConfirmIncomplete(false);
      setScreen("questions");
    } catch (reason) {
      setStartError(reason instanceof Error ? reason.message : "Chưa thể bắt đầu bài kiểm tra.");
    } finally {
      if (activeLessonId.current === lessonId) setStarting(false);
    }
  }

  const submitAnswers = useCallback(
    async (timeExpired = false) => {
      if (!quiz || !session || submitting || submitInFlight.current) return;
      const unanswered = session.questions.filter((question) => !answers[question.id]);
      if (unanswered.length && !timeExpired && !confirmIncomplete) {
        setConfirmIncomplete(true);
        return;
      }

      setConfirmIncomplete(false);
      submitInFlight.current = true;
      setSubmitting(true);
      setSubmitError("");
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const submission: LearningQuizAnswer[] = session.questions.flatMap((question) => {
          const optionId = answers[question.id];
          return optionId ? [{ questionId: question.id, optionId }] : [];
        });
        const result = await submitLearningQuiz(
          token,
          lessonId,
          session.id,
          submission,
          activityEvents,
        );
        if (activeLessonId.current !== lessonId) return;
        try {
          if (storageKeyRef.current) window.localStorage.removeItem(storageKeyRef.current);
        } catch {
          // Keep the submitted result even if this browser blocks storage access.
        }
        setHasLocalDraft(false);
        setAttempt(result);
        if (result.passed) onPassed?.();
      } catch (reason) {
        if (activeLessonId.current !== lessonId) return;
        setSubmitError(reason instanceof Error ? reason.message : "Chưa thể nộp bài kiểm tra.");
      } finally {
        submitInFlight.current = false;
        if (activeLessonId.current === lessonId) setSubmitting(false);
      }
    },
    [
      activityEvents,
      answers,
      confirmIncomplete,
      getAccessToken,
      lessonId,
      onPassed,
      quiz,
      session,
      submitting,
    ],
  );

  useEffect(() => {
    submitAnswersRef.current = submitAnswers;
  }, [submitAnswers]);

  function retryAttempt() {
    setAnswers({});
    setSession(null);
    setActivityEvents([]);
    setAttempt(null);
    setSubmitError("");
    setConfirmIncomplete(false);
    setScreen("intro");
  }

  const jumpToQuestion = useCallback((questionId: string) => {
    setCurrentQuestionId(questionId);
    const question = document.getElementById(`quiz-question-${questionId}`);
    if (!question) return;

    const progressBar = document.getElementById("quiz-progress-sticky");
    const shellHeader = document.getElementById("learning-workspace-header");
    const stickyBottom = Math.max(
      progressBar?.getBoundingClientRect().bottom ?? 0,
      shellHeader?.getBoundingClientRect().bottom ?? 0,
      0,
    );
    const top = window.scrollY + question.getBoundingClientRect().top - stickyBottom - 16;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, []);

  const closeIncompleteConfirmation = useCallback(() => {
    setConfirmIncomplete(false);
  }, []);

  const reviewUnansweredQuestions = useCallback(() => {
    const firstUnanswered = session?.questions.find((question) => !answers[question.id]);
    closeIncompleteConfirmation();
    if (firstUnanswered) window.setTimeout(() => jumpToQuestion(firstUnanswered.id), 0);
  }, [answers, closeIncompleteConfirmation, jumpToQuestion, session]);

  useEffect(() => {
    if (!attempt) return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [attempt]);

  if (loading) {
    return (
      <div role="status" className="space-y-4 px-5 py-7 md:px-8 md:py-9">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Đang tải bài kiểm tra…</span>
        <div className="skeleton h-20 rounded-xl" />
      </div>
    );
  }

  if (loadError || !quiz) {
    return (
      <div className="px-5 py-8 md:px-8">
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p>{loadError || "Chưa thể tải bài kiểm tra."}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="focus-ring mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-rose-300 px-3 font-semibold hover:bg-rose-100"
          >
            <RotateCcw className="h-4 w-4" /> Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  if (attempt) {
    const unansweredCount = attempt.review.filter((item) => !item.selectedOptionLabel).length;
    return (
      <section aria-live="polite" className="space-y-6 px-4 py-6 md:px-8 md:py-8">
        <div className="overflow-hidden rounded-2xl border border-[#dfe9e4] bg-white shadow-sm">
          <div className="h-1.5 bg-[#edf3f0]">
            <div
              className={`h-full transition-[width] ${attempt.passed ? "bg-primary" : "bg-amber-400"}`}
              style={{ width: `${Math.min(100, Math.max(0, attempt.score))}%` }}
            />
          </div>
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${attempt.passed ? "bg-[#eaf7f3] text-[#087c5b]" : "bg-amber-50 text-amber-800"}`}
              >
                {attempt.passed ? (
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <CircleAlert aria-hidden="true" className="h-4 w-4" />
                )}
                {attempt.passed ? "Đạt yêu cầu" : "Chưa đạt điểm yêu cầu"}
              </span>
              <h2 className="mt-3 text-xl font-semibold text-[#101a2c] sm:text-2xl">
                Kết quả bài kiểm tra
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#667085]">
                {attempt.passed
                  ? "Bạn đã hoàn thành bài kiểm tra này."
                  : "Xem lại các câu bên dưới để biết phần cần ôn tập."}
              </p>
            </div>
            <div
              className={`flex shrink-0 items-baseline gap-1 rounded-xl px-5 py-3 ${attempt.passed ? "bg-[#f1faf7] text-primary" : "bg-amber-50 text-amber-700"}`}
            >
              <span className="text-3xl font-bold tabular-nums sm:text-4xl">
                {formatScore(attempt.score)}
              </span>
              <span className="text-lg font-semibold">%</span>
              <span className="ml-2 text-xs font-medium text-[#667085]">Điểm số</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#edf1ef] bg-[#fbfdfc] p-4 sm:grid-cols-3 sm:px-7">
            <div className="rounded-lg bg-white px-4 py-3">
              <p className="text-xs text-[#667085]">Câu trả lời đúng</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#101a2c]">
                {attempt.correctAnswers}
                <span className="text-sm font-medium text-[#667085]">
                  {" "}
                  / {attempt.totalQuestions}
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-white px-4 py-3">
              <p className="text-xs text-[#667085]">Điểm đạt yêu cầu</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#101a2c]">
                {formatScore(quiz.passingScore)}%
              </p>
            </div>
            <div className="col-span-2 rounded-lg bg-white px-4 py-3 sm:col-span-1">
              <p className="text-xs text-[#667085]">Câu chưa trả lời</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#101a2c]">
                {unansweredCount}
              </p>
            </div>
          </div>

          {attempt.activityEventCount > 0 ? (
            <p className="flex items-start gap-2 border-t border-[#edf1ef] px-5 py-3 text-xs leading-5 text-[#667085] sm:px-7">
              <Eye aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              Đã ghi nhận {attempt.activityEventCount} lần chuyển tab hoặc cửa sổ trong lượt làm.
            </p>
          ) : null}
        </div>

        <div className="space-y-3" aria-label="Kết quả từng câu">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[#101a2c]">Xem lại câu trả lời</h3>
              <p className="mt-1 text-sm text-[#667085]">Đáp án đúng được đánh dấu màu xanh.</p>
            </div>
            <span className="text-sm font-medium tabular-nums text-[#667085]">
              {attempt.review.length} câu
            </span>
          </div>
          {attempt.review.map((item) => (
            <article
              key={item.questionId}
              className="min-w-0 rounded-xl border border-[#e4ece8] bg-white p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${item.correct ? "bg-[#eaf7f3] text-primary" : item.selectedOptionLabel ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"}`}
                >
                  {item.correct ? (
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <CircleAlert aria-hidden="true" className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-6 text-[#101a2c] [overflow-wrap:anywhere]">
                      Câu {item.position}. {item.prompt}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.correct ? "bg-[#eaf7f3] text-[#087c5b]" : item.selectedOptionLabel ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}
                    >
                      {item.correct
                        ? "Chính xác"
                        : item.selectedOptionLabel
                          ? "Chưa chính xác"
                          : "Bỏ trống"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-[#edf1ef] pt-3 text-sm leading-6">
                    <p className="break-words text-[#52647d] [overflow-wrap:anywhere]">
                      Bạn chọn:{" "}
                      <span className="font-medium text-[#101a2c]">
                        {item.selectedOptionLabel || "Chưa trả lời"}
                      </span>
                    </p>
                    {!item.correct ? (
                      <p className="break-words text-[#52647d] [overflow-wrap:anywhere]">
                        Đáp án đúng:{" "}
                        <span className="font-semibold text-[#087c5b]">
                          {item.correctOptionLabel}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#edf1ef] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#667085]">
            {quiz.questionsPerAttempt > 0 && quiz.questionsPerAttempt < quiz.questionCount
              ? "Lượt mới sẽ được bốc câu khác từ ngân hàng câu hỏi."
              : "Bạn có thể xem lại từng câu trước khi làm lượt mới."}
          </p>
          <button
            type="button"
            onClick={retryAttempt}
            className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Làm lượt mới
          </button>
        </div>
      </section>
    );
  }

  if (screen === "intro") {
    const displayedCount =
      quiz.questionsPerAttempt > 0
        ? Math.min(quiz.questionsPerAttempt, quiz.questionCount)
        : quiz.questionCount;
    return (
      <section className="space-y-5 px-4 py-6 md:px-8 md:py-8">
        <div className="rounded-xl border border-[#dfe9e4] bg-[#f5fbf9] p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Sẵn sàng làm bài?
          </p>
          <h2 className="mt-2 break-words text-xl font-semibold text-[#101a2c] [overflow-wrap:anywhere]">
            {quiz.lessonTitle}
          </h2>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#52647d]">
            <span>
              {quiz.questionsPerAttempt > 0 && quiz.questionsPerAttempt < quiz.questionCount
                ? `Đề bốc ngẫu nhiên ${displayedCount}/${quiz.questionCount} câu`
                : `${displayedCount} câu hỏi`}
            </span>
            <span>Điểm đạt {formatScore(quiz.passingScore)}%</span>
            {quiz.durationMinutes > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden="true" /> {quiz.durationMinutes} phút
              </span>
            ) : (
              <span>Không giới hạn thời gian</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#e4ece8] bg-white p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-semibold text-[#101a2c]">Theo dõi trong lúc làm bài</h3>
              <p className="mt-1 text-sm leading-6 text-[#667085]">
                Khi bạn nộp bài, hệ thống lưu số lần chuyển sang tab hoặc cửa sổ khác trong lượt
                làm. Đây là dấu hiệu tham khảo, không phải kết luận gian lận.
              </p>
              <p className="mt-2 text-xs leading-5 text-[#667085]">
                Trình duyệt không cho biết bạn đã mở ứng dụng hay trang nào. Ghi nhận thao tác không
                khóa thiết bị và không chặn việc chuyển tab.
              </p>
            </div>
          </div>
        </div>

        {hasLocalDraft ? (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
            Tìm thấy bản nháp trên thiết bị này. Khi tiếp tục, hệ thống sẽ khôi phục các câu trả lời
            đã lưu nếu phiên còn hiệu lực.
          </p>
        ) : null}
        {startError ? (
          <p role="alert" className="text-sm text-rose-700">
            {startError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void startAttempt()}
          disabled={starting}
          className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#159e75] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {starting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {starting
            ? "Đang mở bài kiểm tra…"
            : hasLocalDraft
              ? "Tiếp tục bài kiểm tra"
              : "Bắt đầu làm bài"}
        </button>
      </section>
    );
  }

  if (!session) return null;
  const unansweredQuestions = getUnansweredQuestions();
  const answeredCount = session.questions.length - unansweredQuestions.length;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitAnswers();
      }}
      noValidate
      className="space-y-5 px-4 py-6 md:px-8 md:py-8"
    >
      <div
        id="quiz-progress-sticky"
        className="sticky top-[58px] z-20 -mx-4 bg-[#f8fbfa]/95 px-4 py-2 backdrop-blur-sm transition-[top] duration-200 ease-out motion-reduce:transition-none lg:top-[83px]"
      >
        <div className="rounded-xl border border-[#dfe9e4] bg-white/95 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#101a2c]">Tiến độ bài làm</p>
              <p className="mt-0.5 text-xs text-[#667085]">
                Đã trả lời{" "}
                <span className="font-semibold text-primary">
                  {answeredCount}/{session.questions.length}
                </span>{" "}
                câu
              </p>
            </div>
            {remainingSeconds !== null ? (
              <div
                role="timer"
                aria-live={remainingSeconds <= 60 ? "assertive" : "off"}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold tabular-nums sm:px-3 ${remainingSeconds <= 60 ? "bg-rose-50 text-rose-700" : "bg-[#f5fbf9] text-primary"}`}
              >
                <Clock3 className="h-4 w-4" aria-hidden="true" />{" "}
                {formatRemaining(remainingSeconds)}
              </div>
            ) : null}
          </div>
          <nav aria-label="Điều hướng câu hỏi" className="mt-3">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              {session.questions.map((question, index) => {
                const answered = Boolean(answers[question.id]);
                const current = currentQuestionId === question.id;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => jumpToQuestion(question.id)}
                    aria-label={`Câu ${index + 1}, ${answered ? "đã trả lời" : "chưa trả lời"}${current ? ", đang xem" : ""}`}
                    aria-current={current ? "step" : undefined}
                    className={`focus-ring min-h-10 min-w-10 shrink-0 rounded-lg border px-3 text-sm font-semibold transition ${answered ? "border-primary bg-primary text-white hover:bg-[#159e75]" : "border-[#dfe5ec] bg-white text-[#667085] hover:border-primary hover:text-primary"}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#667085]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" /> Đã trả
                lời
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-[#98a2b3]"
                  aria-hidden="true"
                />{" "}
                Chưa trả lời
              </span>
            </div>
          </nav>
        </div>
      </div>

      {activityEvents.length > 0 ? (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"
        >
          Đã ghi nhận {activityEvents.length} lần chuyển tab hoặc cửa sổ trong lượt này.
        </p>
      ) : null}
      {startError ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {startError}
        </p>
      ) : null}
      {remainingSeconds === 0 ? (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Đã hết giờ. Hệ thống đang nộp các câu bạn đã trả lời.
        </p>
      ) : null}

      {session.questions.map((question, index) => (
        <fieldset
          key={question.id}
          id={`quiz-question-${question.id}`}
          data-question-id={question.id}
          tabIndex={-1}
          className="min-w-0 scroll-mt-[180px] rounded-xl border border-[#e4ece8] bg-white px-4 pb-4 pt-1 focus:outline-none md:scroll-mt-[200px] md:px-5 md:pb-5 md:pt-2"
        >
          <legend className="max-w-full px-2 text-sm font-semibold text-[#667085]">
            Câu {index + 1}
          </legend>
          <p className="mt-1 break-words text-base font-semibold leading-7 text-[#101a2c] [overflow-wrap:anywhere] md:text-lg">
            {question.prompt}
          </p>
          <div className="mt-4 space-y-2.5">
            {question.options.map((option) => {
              const selected = answers[question.id] === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-sm leading-6 transition ${submitting || remainingSeconds === 0 ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${selected ? "border-primary bg-[#effaf6]" : "border-[#e8eeeb] hover:border-[#b9e8d8]"}`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.id}
                    checked={selected}
                    disabled={submitting || remainingSeconds === 0}
                    onChange={() => {
                      setAnswers((current) => ({ ...current, [question.id]: option.id }));
                      setConfirmIncomplete(false);
                    }}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-center bg-no-repeat transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${selected ? "border-primary" : "border-[#98a2b3] bg-white"}`}
                    style={{
                      backgroundImage: selected
                        ? "radial-gradient(circle, #20b486 0 38%, #ffffff 43%)"
                        : undefined,
                    }}
                  />
                  <span className="min-w-0 flex-1 break-words text-[#101a2c] [overflow-wrap:anywhere]">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {submitError ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <p>{submitError}</p>
          <button
            type="button"
            onClick={() => void submitAnswers(remainingSeconds === 0)}
            disabled={submitting}
            className="focus-ring mt-2 font-semibold underline disabled:opacity-60"
          >
            Thử nộp lại
          </button>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || starting || remainingSeconds === 0}
        className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#159e75] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {submitting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        {submitting ? "Đang nộp bài…" : "Nộp bài kiểm tra"}
      </button>
      {hasLocalDraft ? (
        <p className="text-xs text-[#667085]">
          Bản nháp câu trả lời được lưu trên thiết bị này cho đến khi bạn nộp bài.
        </p>
      ) : null}
      <FeedbackModal
        isOpen={confirmIncomplete}
        onClose={closeIncompleteConfirmation}
        title="Bạn chưa trả lời hết câu hỏi"
        description={`Còn ${unansweredQuestions.length} câu chưa trả lời. Bạn có thể xem lại hoặc nộp bài với các câu đang bỏ trống.`}
        tone="warning"
        confirmText={`Vẫn nộp`}
        onConfirm={() => void submitAnswers()}
        cancelText="Xem câu chưa làm"
        onCancel={reviewUnansweredQuestions}
      />
    </form>
  );
}

function getTokenSubject(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "current-session";
    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return String(JSON.parse(window.atob(normalized)).sub || "current-session");
  } catch {
    return "current-session";
  }
}

function readDraft(key: string): QuizDraft | null {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<QuizDraft>;
    if (
      typeof parsed.quizId !== "string" ||
      typeof parsed.sessionId !== "string" ||
      !parsed.answers ||
      typeof parsed.answers !== "object" ||
      !Array.isArray(parsed.activityEvents)
    )
      return null;
    const activityEvents = parsed.activityEvents.filter(isActivityEvent);
    return { ...(parsed as QuizDraft), activityEvents };
  } catch {
    return null;
  }
}

function isActivityEvent(value: unknown): value is LearningQuizActivityEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<LearningQuizActivityEvent>;
  return (
    (event.eventType === "TAB_HIDDEN" || event.eventType === "WINDOW_BLUR") &&
    typeof event.occurredAt === "string"
  );
}

function formatScore(score: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(score);
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}
