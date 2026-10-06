"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, RotateCcw } from "lucide-react";
import {
  fetchLearningQuiz,
  submitLearningQuiz,
  type LearningQuiz,
  type LearningQuizAnswer,
  type LearningQuizAttempt,
} from "@/lib/learning-client";

type Props = {
  lessonId: string;
  getAccessToken: () => Promise<string | null>;
  onPassed?: () => void;
};

export function LearningQuizContent({ lessonId, getAccessToken, onPassed }: Props) {
  const [quiz, setQuiz] = useState<LearningQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<LearningQuizAttempt | null>(null);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const result = await fetchLearningQuiz(token, lessonId);
      if (!result.questions.length) throw new Error("Bài kiểm tra hiện chưa có câu hỏi.");
      setQuiz(result);
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Chưa thể tải bài kiểm tra.");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, lessonId]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz, retryCount]);

  async function submitAnswers() {
    if (!quiz) return;

    const unanswered = quiz.questions.find((question) => !answers[question.id]);
    if (unanswered) {
      setValidationError(`Vui lòng chọn đáp án cho câu ${unanswered.position}.`);
      document.getElementById(`quiz-question-${unanswered.id}`)?.focus();
      return;
    }

    const submission: LearningQuizAnswer[] = quiz.questions.map((question) => ({
      questionId: question.id,
      optionId: answers[question.id],
    }));

    setSubmitting(true);
    setSubmitError("");
    setValidationError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const result = await submitLearningQuiz(token, lessonId, submission);
      setAttempt(result);
      if (result.passed) onPassed?.();
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "Chưa thể nộp bài kiểm tra.");
    } finally {
      setSubmitting(false);
    }
  }

  function retryAttempt() {
    setAnswers({});
    setAttempt(null);
    setValidationError("");
    setSubmitError("");
  }

  if (loading) {
    return (
      <div role="status" className="space-y-4 px-5 py-7 md:px-8 md:py-9">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Đang tải bài kiểm tra…</span>
        <div className="skeleton h-20 rounded-xl" />
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
            <RotateCcw className="h-4 w-4" />
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  if (attempt) {
    return (
      <section aria-live="polite" className="px-5 py-8 md:px-8">
        <div
          className={`rounded-xl border p-5 ${attempt.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
        >
          <div className="flex items-start gap-3">
            {attempt.passed ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            ) : (
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            )}
            <div>
              <h2 className="font-semibold text-[#101a2c]">
                {attempt.passed ? "Bạn đã hoàn thành bài kiểm tra" : "Chưa đạt điểm yêu cầu"}
              </h2>
              <p className="mt-2 text-sm text-[#43514b]">
                Điểm: <strong>{formatScore(attempt.score)}%</strong> · Đúng {attempt.correctAnswers}
                /{attempt.totalQuestions} câu · Điểm đạt: {formatScore(quiz.passingScore)}%
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={retryAttempt}
          className="focus-ring mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-[#dfe9e4] px-4 text-sm font-semibold text-[#52605a] hover:border-primary hover:text-primary"
        >
          <RotateCcw className="h-4 w-4" />
          Làm lại bài kiểm tra
        </button>
      </section>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitAnswers();
      }}
      noValidate
      className="space-y-5 px-5 py-7 md:px-8 md:py-9"
    >
      <p className="text-sm text-[#74817b]">
        {quiz.questions.length} câu hỏi · Điểm đạt {formatScore(quiz.passingScore)}%
      </p>
      {quiz.questions.map((question, index) => (
        <fieldset
          key={question.id}
          id={`quiz-question-${question.id}`}
          tabIndex={-1}
          aria-describedby={
            validationError && !answers[question.id] ? "quiz-validation-error" : undefined
          }
          className="rounded-xl border border-[#e4ece8] p-4 focus:outline-none focus:ring-2 focus:ring-primary/30 md:p-5"
        >
          <legend className="max-w-full px-1 text-sm font-semibold leading-6 text-[#101a2c]">
            Câu {index + 1}. {question.prompt}
          </legend>
          <div className="mt-2 space-y-2">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm transition ${answers[question.id] === option.id ? "border-primary bg-[#effaf6]" : "border-[#e8eeeb] hover:border-[#b9e8d8]"}`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => {
                    setAnswers((current) => ({ ...current, [question.id]: option.id }));
                    setValidationError("");
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#20b486] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {validationError && (
        <p id="quiz-validation-error" role="alert" className="text-sm font-medium text-rose-700">
          {validationError}
        </p>
      )}
      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <p>{submitError}</p>
          <button
            type="button"
            onClick={() => void submitAnswers()}
            disabled={submitting}
            className="focus-ring mt-2 font-semibold underline disabled:opacity-60"
          >
            Thử nộp lại
          </button>
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-[#159e75] disabled:cursor-wait disabled:opacity-70"
      >
        {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {submitting ? "Đang nộp bài…" : "Nộp bài kiểm tra"}
      </button>
    </form>
  );
}

function formatScore(score: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(score);
}
