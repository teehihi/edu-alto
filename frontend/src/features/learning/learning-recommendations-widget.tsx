"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Compass,
  LoaderCircle,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import {
  fetchCourseRecommendations,
  fetchLearningNextRecommendations,
  fetchLearningPreferences,
  submitRecommendationFeedback,
  updateLearningPreferences,
} from "@/lib/recommendation-client";
import type { CourseLevel } from "@/types/course";
import type {
  CourseRecommendationItem,
  CourseRecommendationsResponse,
  LearningNextRecommendationsResponse,
  LearningPreferences,
} from "@/types/recommendation";

const levelLabels: Record<CourseLevel, string> = {
  ALL_LEVELS: "Mọi trình độ",
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

function formatPrice(price: number): string {
  if (price <= 0) return "Miễn phí";
  return `${new Intl.NumberFormat("vi-VN").format(price)}đ`;
}

export function LearningRecommendationsWidget({ hasEnrollments }: { hasEnrollments: boolean }) {
  const { getAccessToken } = useAuthSession();
  const [nextLearning, setNextLearning] = useState<LearningNextRecommendationsResponse | null>(
    null,
  );
  const [courseRecs, setCourseRecs] = useState<CourseRecommendationsResponse | null>(null);
  const [preferences, setPreferences] = useState<LearningPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPrefs, setEditingPrefs] = useState(false);

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [preferredLevel, setPreferredLevel] = useState<CourseLevel | "">("");
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState("");
  const [prefsSavedMessage, setPrefsSavedMessage] = useState("");

  const fetchAndApplyRecommendations = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        return;
      }
      const [nextRes, courseRes, prefRes] = await Promise.allSettled([
        fetchLearningNextRecommendations(token, 4),
        fetchCourseRecommendations({ limit: 3, accessToken: token }),
        fetchLearningPreferences(token),
      ]);

      if (nextRes.status === "fulfilled") {
        setNextLearning(nextRes.value);
      }
      if (courseRes.status === "fulfilled") {
        setCourseRecs(courseRes.value);
      }
      if (prefRes.status === "fulfilled") {
        const pref = prefRes.value;
        setPreferences(pref);
        setSelectedTopics(pref.preferredTopics);
        setLearningGoal(pref.learningGoal ?? "");
        setPreferredLevel(pref.preferredLevel ?? "");
        setPersonalizationEnabled(pref.personalizationEnabled);
        if (!pref.onboardingCompleted && !hasEnrollments) {
          setEditingPrefs(true);
        }
      }

      if (nextRes.status === "rejected" && courseRes.status === "rejected") {
        setError("Chưa thể tải gợi ý học tập lúc này. Vui lòng thử lại sau.");
      } else {
        setError("");
      }
    } catch {
      setError("Chưa thể tải gợi ý học tập lúc này. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, hasEnrollments]);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError("");
    await fetchAndApplyRecommendations();
  }, [fetchAndApplyRecommendations]);

  useEffect(() => {
    void fetchAndApplyRecommendations();
  }, [fetchAndApplyRecommendations]);

  function toggleTopic(topic: string) {
    setPrefsError("");
    setSelectedTopics((prev) => {
      if (prev.includes(topic)) {
        return prev.filter((t) => t !== topic);
      }
      if (prev.length >= 12) {
        setPrefsError("Bạn chỉ có thể chọn tối đa 12 chủ đề quan tâm.");
        return prev;
      }
      return [...prev, topic];
    });
  }

  function handleAddCustomTopic() {
    const trimmed = customTopic.trim();
    if (!trimmed) return;
    if (trimmed.length < 2 || trimmed.length > 60) {
      setPrefsError("Tên chủ đề phải từ 2 đến 60 ký tự.");
      return;
    }
    if (!selectedTopics.includes(trimmed)) {
      if (selectedTopics.length >= 12) {
        setPrefsError("Bạn chỉ có thể chọn tối đa 12 chủ đề quan tâm.");
        return;
      }
      setSelectedTopics((prev) => [...prev, trimmed]);
    }
    setCustomTopic("");
    setPrefsError("");
  }

  async function handleSavePreferences(event: FormEvent) {
    event.preventDefault();
    setPrefsError("");
    setPrefsSavedMessage("");
    if (personalizationEnabled && selectedTopics.length === 0 && !learningGoal.trim()) {
      setPrefsError("Hãy chọn ít nhất 1 chủ đề quan tâm hoặc nhập mục tiêu học tập.");
      return;
    }

    setSavingPrefs(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
      const updated = await updateLearningPreferences(token, {
        preferredTopics: selectedTopics,
        preferredLevel: preferredLevel || null,
        learningGoal: learningGoal.trim() || null,
        personalizationEnabled,
      });
      setPreferences(updated);
      setEditingPrefs(false);
      setPrefsSavedMessage("Đã cập nhật sở thích gợi ý học tập.");
      await loadRecommendations();
    } catch (reason: unknown) {
      setPrefsError(
        reason instanceof ApiClientError
          ? reason.message
          : "Không thể lưu sở thích học tập. Vui lòng thử lại.",
      );
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleTogglePersonalization(nextEnabled: boolean) {
    setSavingPrefs(true);
    setPrefsError("");
    try {
      const token = await getAccessToken();
      if (!token) return;
      const updated = await updateLearningPreferences(token, {
        preferredTopics: selectedTopics,
        preferredLevel: preferredLevel || null,
        learningGoal: learningGoal.trim() || null,
        personalizationEnabled: nextEnabled,
      });
      setPreferences(updated);
      setPersonalizationEnabled(nextEnabled);
      await loadRecommendations();
    } catch {
      setPrefsError("Không thể cập nhật trạng thái cá nhân hóa.");
    } finally {
      setSavingPrefs(false);
    }
  }

  function handleTrackClick(
    targetType: "COURSE" | "LESSON" | "QUIZ_REVIEW",
    targetId: string,
    snapshotId: string | null,
    itemId: string | null,
  ) {
    void getAccessToken().then((token) => {
      if (!token) return;
      return submitRecommendationFeedback(token, {
        snapshotId,
        recommendationItemId: itemId,
        targetType,
        targetId,
        feedbackType: "CLICKED",
      }).catch(() => undefined);
    });
  }

  async function handleDismissNextItem(
    lessonId: string,
    itemType: "LESSON" | "QUIZ_REVIEW",
    itemId: string,
  ) {
    setNextLearning((prev) =>
      prev ? { ...prev, items: prev.items.filter((item) => item.lessonId !== lessonId) } : prev,
    );
    try {
      const token = await getAccessToken();
      if (!token) return;
      await submitRecommendationFeedback(token, {
        snapshotId: nextLearning?.snapshotId,
        recommendationItemId: itemId,
        targetType: itemType,
        targetId: lessonId,
        feedbackType: "DISMISSED",
      });
    } catch {
      // Non-blocking dismiss
    }
  }

  async function handleDismissCourse(course: CourseRecommendationItem) {
    setCourseRecs((prev) =>
      prev ? { ...prev, items: prev.items.filter((item) => item.id !== course.id) } : prev,
    );
    try {
      const token = await getAccessToken();
      if (!token) return;
      await submitRecommendationFeedback(token, {
        snapshotId: courseRecs?.snapshotId,
        recommendationItemId: course.itemId,
        targetType: "COURSE",
        targetId: course.id,
        feedbackType: "DISMISSED",
      });
    } catch {
      // Non-blocking dismiss
    }
  }

  const nextItems = nextLearning?.items ?? [];
  const recommendedCourses = courseRecs?.items ?? [];
  const suggestedTopics = preferences?.suggestedTopics ?? [
    "Lập trình Web",
    "Java & Spring Boot",
    "React & Next.js",
    "UI/UX Design",
    "Cơ sở dữ liệu & SQL",
    "Phân tích dữ liệu",
  ];
  const isPersonalizationDisabled = preferences ? !preferences.personalizationEnabled : false;

  return (
    <div className="space-y-6">
      {/* 1. Next Lesson & Review Recommendations */}
      <section className="portal-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-primary">
                <Target className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-sm font-semibold tracking-tight text-heading">
                Gợi ý học &amp; ôn tập tiếp theo
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Dựa trên tiến độ bài giảng và kết quả luyện tập thực tế của bạn
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPrefsSavedMessage("");
                setEditingPrefs((prev) => !prev);
              }}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-heading transition hover:border-primary/40 hover:text-primary"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{editingPrefs ? "Thu gọn sở thích" : "Sở thích học tập"}</span>
            </button>
          </div>
        </div>

        {prefsSavedMessage ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-800">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{prefsSavedMessage}</span>
          </div>
        ) : null}

        {/* Onboarding / Preferences Editor */}
        {editingPrefs ? (
          <form
            onSubmit={handleSavePreferences}
            className="mt-4 rounded-xl border border-emerald-200/80 bg-[#F5FBF9]/80 p-4 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-heading">
                  Cá nhân hóa lộ trình theo chủ đề &amp; mục tiêu
                </h3>
                <p className="mt-0.5 text-[11px] text-muted">
                  Chọn các chủ đề bạn muốn ưu tiên để EduAlto gợi ý khóa học và bài ôn phù hợp.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-heading">
                <input
                  type="checkbox"
                  checked={personalizationEnabled}
                  onChange={(e) => setPersonalizationEnabled(e.target.checked)}
                  className="focus-ring h-4 w-4 rounded border-slate-300 text-primary"
                />
                <span>Bật gợi ý cá nhân hóa</span>
              </label>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-heading mb-2">
                Chủ đề quan tâm ({selectedTopics.length}/12)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(new Set([...suggestedTopics, ...selectedTopics])).map((topic) => {
                  const selected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={cn(
                        "focus-ring inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-slate-200 bg-white text-heading hover:border-primary/40 hover:text-primary",
                      )}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                      <span>{topic}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <label htmlFor="custom-learning-topic" className="sr-only">
                  Thêm chủ đề khác
                </label>
                <input
                  id="custom-learning-topic"
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Thêm chủ đề khác (VD: Spring Security, IELTS...)"
                  className="focus-ring h-8 flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-heading placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTopic}
                  className="focus-ring h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-heading hover:border-primary/40 hover:text-primary"
                >
                  Thêm chủ đề
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="learning-goal-input"
                  className="block text-[11px] font-semibold text-heading mb-1"
                >
                  Mục tiêu học tập
                </label>
                <input
                  id="learning-goal-input"
                  type="text"
                  maxLength={500}
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  placeholder="VD: Trở thành Java Backend Developer trong 3 tháng"
                  className="focus-ring h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-heading placeholder:text-muted"
                />
              </div>
              <div>
                <label
                  htmlFor="preferred-level-select"
                  className="block text-[11px] font-semibold text-heading mb-1"
                >
                  Trình độ ưu tiên
                </label>
                <select
                  id="preferred-level-select"
                  value={preferredLevel}
                  onChange={(e) => setPreferredLevel(e.target.value as CourseLevel | "")}
                  className="focus-ring h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-heading"
                >
                  <option value="">Tất cả trình độ</option>
                  <option value="BEGINNER">Cơ bản</option>
                  <option value="INTERMEDIATE">Trung cấp</option>
                  <option value="ADVANCED">Nâng cao</option>
                </select>
              </div>
            </div>

            {prefsError ? (
              <p className="text-xs font-medium text-rose-600" role="alert">
                {prefsError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPrefs(false)}
                className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-muted hover:text-heading"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={savingPrefs}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
              >
                {savingPrefs ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu sở thích</span>
                )}
              </button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <div
            role="status"
            aria-label="Đang tải gợi ý học tập"
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : error ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50/60 px-4 py-3 text-xs text-rose-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadRecommendations()}
              className="focus-ring inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-50"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : isPersonalizationDisabled ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-muted">
            <span>Bạn đang tắt gợi ý cá nhân hóa cho tài khoản này.</span>
            <button
              type="button"
              disabled={savingPrefs}
              onClick={() => void handleTogglePersonalization(true)}
              className="focus-ring rounded-lg bg-primary px-3 py-1.5 font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              Bật lại gợi ý
            </button>
          </div>
        ) : nextItems.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center">
            <p className="text-xs font-semibold text-heading">Chưa có gợi ý học tập phù hợp</p>
            <p className="mt-1 text-[11px] text-muted">
              {hasEnrollments
                ? "Bạn đã hoàn thành các nội dung ưu tiên hiện tại hoặc hãy tiếp tục học các khóa đã đăng ký."
                : "Hãy đăng ký khóa học đầu tiên hoặc chọn chủ đề quan tâm để nhận gợi ý bài học tiếp theo."}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {nextItems.map((item) => {
              const isQuizReview = item.itemType === "QUIZ_REVIEW";
              return (
                <article
                  key={item.itemId}
                  className="flex flex-col justify-between rounded-lg border border-slate-200/80 bg-white p-3.5 transition hover:border-primary/40 hover:shadow-soft"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold",
                          isQuizReview
                            ? "bg-amber-50 text-amber-800 border border-amber-200/70"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200/70",
                        )}
                      >
                        {item.reasonCode === "REVIEW_WEAK_QUIZ"
                          ? "Cần ôn tập"
                          : isQuizReview
                            ? "Bài kiểm tra"
                            : "Bước tiếp theo"}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-muted">
                        {item.estimatedMinutes ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />~{item.estimatedMinutes} phút
                          </span>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Ẩn gợi ý ${item.lessonTitle}`}
                          title="Ẩn gợi ý này"
                          onClick={() =>
                            void handleDismissNextItem(item.lessonId, item.itemType, item.itemId)
                          }
                          className="focus-ring rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-heading">
                      {item.lessonTitle}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-primary">
                      {item.courseTitle}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{item.reasonText}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted truncate">{item.sectionTitle}</span>
                    <Link
                      href={item.targetUrl}
                      onClick={() =>
                        handleTrackClick(
                          item.itemType,
                          item.lessonId,
                          nextLearning?.snapshotId ?? null,
                          item.itemId,
                        )
                      }
                      className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-dark"
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Personalized Course Recommendations */}
      {!isPersonalizationDisabled && recommendedCourses.length > 0 ? (
        <section className="portal-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-primary">
                <Compass className="h-3.5 w-3.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-heading">
                  Khóa học gợi ý dành cho bạn
                </h2>
                <p className="text-[11px] text-muted">
                  Được chọn theo mục tiêu, sở thích và lịch sử học tập của bạn
                </p>
              </div>
            </div>
            <Link
              href="/courses"
              className="focus-ring text-xs font-semibold text-primary hover:underline"
            >
              Khám phá thêm →
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {recommendedCourses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200/80 bg-white p-3.5 transition hover:border-primary/40 hover:shadow-soft"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      <Sparkles className="h-2.5 w-2.5" />
                      {levelLabels[course.level] ?? "Mọi trình độ"}
                    </span>
                    <button
                      type="button"
                      aria-label={`Ẩn khóa học ${course.title}`}
                      title="Ẩn gợi ý này"
                      onClick={() => void handleDismissCourse(course)}
                      className="focus-ring rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Link
                    href={`/courses/${encodeURIComponent(course.slug)}`}
                    onClick={() =>
                      handleTrackClick(
                        "COURSE",
                        course.id,
                        courseRecs?.snapshotId ?? null,
                        course.itemId,
                      )
                    }
                    className="focus-ring mt-2 block"
                  >
                    <h3 className="line-clamp-2 text-sm font-semibold text-heading hover:text-primary transition">
                      {course.title}
                    </h3>
                  </Link>
                  <p className="mt-1 text-[11px] text-muted">
                    {course.instructor?.fullName ?? "Giảng viên EduAlto"}
                  </p>
                  <p className="mt-2 rounded-md bg-[#F5FBF9] px-2 py-1.5 text-[11px] leading-snug text-emerald-900">
                    {course.reasonText}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-heading">
                    {formatPrice(course.price)}
                  </span>
                  <Link
                    href={`/courses/${encodeURIComponent(course.slug)}`}
                    onClick={() =>
                      handleTrackClick(
                        "COURSE",
                        course.id,
                        courseRecs?.snapshotId ?? null,
                        course.itemId,
                      )
                    }
                    className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <BookOpen className="h-3 w-3" />
                    <span>Xem khóa học</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
