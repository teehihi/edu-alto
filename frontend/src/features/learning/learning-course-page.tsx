"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Award,
  ChevronDown,
  ChevronRight,
  CirclePlay,
  Clock3,
  GraduationCap,
  LockKeyhole,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ApiClientError } from "@/lib/api";
import {
  fetchCourseProgress,
  fetchLearningCurriculum,
  fetchMyEnrollments,
  type CourseProgress,
  type Enrollment,
  type LearningCurriculum,
} from "@/lib/learning-client";
import { useAuthSession } from "@/lib/auth-session";

export function LearningCoursePage({ courseId }: { courseId: string }) {
  const { user, isLoading: sessionLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [curriculum, setCurriculum] = useState<LearningCurriculum | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/learning/courses/${courseId}`)}`);
      return;
    }
    let active = true;
    void getAccessToken()
      .then((token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return fetchMyEnrollments(token).then(async (page) => {
          const match = page.data.find((item) => item.courseId === courseId);
          if (!match)
            throw new ApiClientError(403, {
              code: "ENROLLMENT_REQUIRED",
              message: "Bạn chưa ghi danh khóa học này.",
              details: [],
            });
          if (match.courseStatus !== "PUBLISHED") throw new Error("Khóa học hiện đã được lưu trữ.");
          const [curriculumResult, progressResult] = await Promise.all([
            fetchLearningCurriculum(token, match.courseSlug),
            fetchCourseProgress(token, courseId),
          ]);
          if (!active) return;
          setEnrollment(match);
          setCurriculum(curriculumResult);
          setProgress(progressResult);
          setExpanded(
            Object.fromEntries(
              curriculumResult.sections.map((section, index) => [section.id, index === 0]),
            ),
          );
        });
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(
            error instanceof ApiClientError && error.status === 403
              ? "Bạn cần ghi danh khóa học trước khi vào lớp học."
              : error instanceof ApiClientError && error.status === 404
                ? "Không tìm thấy khóa học hoặc giáo trình đã được gỡ."
                : error instanceof Error
                  ? error.message
                  : "Chưa thể tải khóa học. Vui lòng thử lại.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [courseId, getAccessToken, router, sessionLoading, user]);

  const allLessons = curriculum?.sections.flatMap((section) => section.lessons) ?? [];
  const nextLesson = allLessons.find((lesson) =>
    ["TEXT", "VIDEO", "QUIZ"].includes(lesson.lessonType),
  );

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#101a2c]">
      <AppHeader />
      <main className="container-page py-8 md:py-10">
        <nav aria-label="Đường dẫn" className="mb-5 flex items-center gap-2 text-xs text-[#7b8782]">
          <Link href="/learning/courses" className="focus-ring rounded hover:text-primary">
            Khóa học của tôi
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span aria-current="page" className="truncate text-primary">
            {enrollment?.courseTitle ?? "Đang tải khóa học"}
          </span>
        </nav>
        {loading ? (
          <div role="status" className="space-y-4">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-72 rounded-2xl" />
          </div>
        ) : message ? (
          <div
            role="alert"
            className="mx-auto max-w-xl rounded-2xl border border-[#e4ece8] bg-white p-8 text-center"
          >
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e7faf3] text-primary">
              <BookOpen className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-xl font-semibold">Chưa thể mở khóa học</h1>
            <p className="mt-2 text-sm text-[#667085]">{message}</p>
            <Link
              href="/learning/courses"
              className="focus-ring mt-5 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              Quay về khóa học của tôi
            </Link>
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-gradient-to-r from-[#e4f8f1] via-white to-[#f4faf7] p-6 md:flex md:items-center md:justify-between md:p-8">
              <div>
                <p className="text-xs font-semibold text-primary">KHÓA HỌC CỦA TÔI</p>
                <h1 className="mt-2 text-2xl font-bold md:text-3xl">{enrollment?.courseTitle}</h1>
                <p className="mt-2 text-sm text-[#74817b]">Tiếp tục từ bài học bạn đang học dở.</p>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-white bg-white/90 px-4 py-3 shadow-sm md:mt-0">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e6faf3] text-primary">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {progress?.completedLessons ?? 0} / {progress?.totalLessons ?? 0} bài học
                  </span>
                  <span className="mt-1 block text-xs text-[#84908b]">
                    {progress?.progressPercent ?? 0}% hoàn thành
                  </span>
                </span>
              </div>
            </section>
            {progress?.completed && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ccefe2] bg-[#effbf6] px-4 py-3">
                <p className="text-sm font-medium text-[#276c55]">
                  Bạn đã hoàn thành giáo trình khóa học.
                </p>
                <Link
                  href={`/learning/certificates/${encodeURIComponent(courseId)}`}
                  className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]"
                >
                  <Award className="h-4 w-4" aria-hidden="true" />
                  Xem chứng chỉ
                </Link>
              </div>
            )}
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-2xl border border-[#e4ece8] bg-white p-5 md:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Giáo trình khóa học</h2>
                    <p className="mt-1 text-sm text-[#87928d]">
                      {curriculum?.sections.length ?? 0} chương · {allLessons.length} bài học
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-[#e8faf4] px-3 py-1.5 text-xs font-medium text-primary sm:inline-flex">
                    Tiến độ được lưu tự động
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {curriculum?.sections.length ? (
                    curriculum.sections.map((section, index) => {
                      const isOpen = expanded[section.id] ?? false;
                      return (
                        <section
                          key={section.id}
                          className="overflow-hidden rounded-xl border border-[#e7eeeb]"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((current) => ({ ...current, [section.id]: !isOpen }))
                            }
                            aria-expanded={isOpen}
                            className="focus-ring flex min-h-14 w-full items-center justify-between gap-3 bg-[#fbfdfc] px-4 py-3 text-left hover:bg-[#f6fbf9]"
                          >
                            <span>
                              <span className="block text-sm font-semibold">{section.title}</span>
                              <span className="mt-1 block text-[11px] text-[#89948f]">
                                Chương {index + 1} · {section.lessons.length} bài học
                              </span>
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 text-[#83908a] transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                          </button>
                          {isOpen && (
                            <ul className="divide-y divide-[#eef2f0]">
                              {section.lessons.map((lesson) => {
                                const typeSupported = ["TEXT", "VIDEO", "QUIZ"].includes(
                                  lesson.lessonType,
                                );
                                return (
                                  <li key={lesson.id}>
                                    <Link
                                      href={
                                        typeSupported
                                          ? `/learning/lessons/${lesson.id}?courseId=${courseId}`
                                          : "#lesson-unavailable"
                                      }
                                      onClick={(event) => {
                                        if (!typeSupported) event.preventDefault();
                                      }}
                                      className={`focus-ring flex items-center gap-3 px-4 py-3 transition ${typeSupported ? "hover:bg-[#f1fbf7]" : "cursor-default opacity-70"}`}
                                    >
                                      <span
                                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${typeSupported ? "bg-[#e8faf4] text-primary" : "bg-[#f0f2f1] text-[#89948f]"}`}
                                      >
                                        {typeSupported ? (
                                          <CirclePlay className="h-4 w-4" />
                                        ) : (
                                          <LockKeyhole className="h-4 w-4" />
                                        )}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-[#34413c]">
                                          {lesson.title}
                                        </span>
                                        <span className="mt-1 block text-[11px] text-[#89948f]">
                                          {typeSupported
                                            ? lesson.lessonType === "QUIZ"
                                              ? "Bài kiểm tra"
                                              : lesson.lessonType === "VIDEO"
                                                ? "Bài giảng video"
                                                : "Bài học văn bản"
                                            : "Nội dung này sẽ sớm được hỗ trợ"}
                                          {lesson.durationSeconds
                                            ? ` · ${Math.ceil(lesson.durationSeconds / 60)} phút`
                                            : ""}
                                        </span>
                                      </span>
                                      {typeSupported && (
                                        <ChevronRight className="h-4 w-4 text-[#9ba5a1]" />
                                      )}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </section>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#dce8e2] px-5 py-10 text-center">
                      <BookOpen className="mx-auto h-8 w-8 text-primary" />
                      <p className="mt-3 text-sm font-semibold">Giáo trình đang được hoàn thiện</p>
                      <p className="mt-1 text-xs text-[#87928d]">
                        Nội dung mới sẽ xuất hiện tại đây.
                      </p>
                    </div>
                  )}
                </div>
              </section>
              <aside className="space-y-4">
                <div className="rounded-2xl border border-[#e4ece8] bg-white p-5">
                  <h2 className="text-sm font-semibold">Tiếp tục học</h2>
                  <p className="mt-1 text-xs leading-5 text-[#84908b]">
                    Mở bài học văn bản đầu tiên hoặc tiếp tục phần đang học.
                  </p>
                  {nextLesson ? (
                    <Link
                      href={`/learning/lessons/${nextLesson.id}?courseId=${courseId}`}
                      className="focus-ring mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]"
                    >
                      <CirclePlay className="h-4 w-4" />
                      Mở bài học
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <p className="mt-4 rounded-lg bg-[#f6f8f7] p-3 text-xs text-[#84908b]">
                      Chưa có bài học văn bản khả dụng.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-[#e4ece8] bg-white p-5">
                  <h2 className="text-sm font-semibold">Tiến độ khóa học</h2>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-3xl font-bold text-primary">
                      {progress?.progressPercent ?? 0}%
                    </span>
                    <span className="text-xs text-[#84908b]">đã hoàn thành</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e9f1ed]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${progress?.progressPercent ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-[#84908b]">
                    <Clock3 className="h-4 w-4" />
                    Cập nhật theo giáo trình hiện tại
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
