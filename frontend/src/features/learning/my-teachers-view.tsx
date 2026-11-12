"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  GraduationCap,
  MessageCircle,
  Search,
  Send,
  X,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { fetchPublicCourseBySlug } from "@/lib/course-client";
import { fetchPublicInstructorPage } from "@/lib/instructor-client";
import { fetchMyEnrollments } from "@/lib/learning-client";
import { startStudentConversation } from "@/lib/student-messaging-client";
import type { PublicInstructor } from "@/types/instructor";

export function MyTeachersView() {
  const router = useRouter();
  const { getAccessToken } = useAuthSession();
  const [instructors, setInstructors] = useState<PublicInstructor[]>([]);
  const [enrolledCoursesByInstructor, setEnrolledCoursesByInstructor] = useState<
    Record<string, string[]>
  >({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeInstructor, setActiveInstructor] = useState<PublicInstructor | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [instructorPage, token] = await Promise.all([
        fetchPublicInstructorPage({ page: 0, size: 50 }),
        getAccessToken(),
      ]);

      const courseMap: Record<string, string[]> = {};
      const extraInstructors: PublicInstructor[] = [];

      if (token) {
        try {
          const enrollmentsPage = await fetchMyEnrollments(token);
          const uniqueSlugs = Array.from(
            new Set(enrollmentsPage.data.map((item) => item.courseSlug).filter(Boolean)),
          );
          const details = await Promise.allSettled(
            uniqueSlugs.map((slug) => fetchPublicCourseBySlug(slug)),
          );
          for (const result of details) {
            if (result.status !== "fulfilled" || !result.value.instructor) continue;
            const course = result.value;
            const inst = course.instructor!;
            courseMap[inst.id] = [...(courseMap[inst.id] ?? []), course.title];
            if (!instructorPage.data.some((item) => item.id === inst.id)) {
              extraInstructors.push({
                id: inst.id,
                fullName: inst.fullName,
                headline: inst.headline,
                bio: null,
                avatarUrl: inst.avatarUrl,
                xUrl: null,
                linkedinUrl: null,
                websiteUrl: null,
                expertise: null,
                experienceYears: null,
                teachingExperience: null,
                specialties: null,
              });
            }
          }
        } catch (reason) {
          if (!(reason instanceof ApiClientError && reason.code === "STUDENT_REQUIRED")) {
            // Non-blocking: still display public instructors list
          }
        }
      }

      const merged = [...instructorPage.data, ...extraInstructors];
      merged.sort((first, second) => {
        const firstEnrolled = (courseMap[first.id]?.length ?? 0) > 0 ? 1 : 0;
        const secondEnrolled = (courseMap[second.id]?.length ?? 0) > 0 ? 1 : 0;
        if (secondEnrolled !== firstEnrolled) return secondEnrolled - firstEnrolled;
        return first.fullName.localeCompare(second.fullName, "vi");
      });

      setEnrolledCoursesByInstructor(courseMap);
      setInstructors(merged);
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể tải danh sách giảng viên lúc này.",
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const visibleInstructors = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    if (!query) return instructors;
    return instructors.filter((item) => {
      const coursesText = (enrolledCoursesByInstructor[item.id] ?? []).join(" ");
      return `${item.fullName} ${item.headline ?? ""} ${item.expertise ?? ""} ${item.specialties ?? ""} ${coursesText}`
        .toLocaleLowerCase("vi")
        .includes(query);
    });
  }, [enrolledCoursesByInstructor, instructors, search]);

  async function handleStartConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeInstructor || sending) return;
    const trimmed = messageBody.trim();
    if (!trimmed) {
      setSendError("Vui lòng nhập nội dung tin nhắn cho giảng viên.");
      return;
    }

    setSending(true);
    setSendError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const started = await startStudentConversation(activeInstructor.id, trimmed, token);
      setActiveInstructor(null);
      setMessageBody("");
      router.push(
        `/learning/messages?conversationId=${encodeURIComponent(started.conversationId)}`,
      );
    } catch (reason) {
      setSendError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể bắt đầu cuộc trò chuyện lúc này.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải giảng viên">
        {[0, 1, 2].map((item) => (
          <div key={item} className="skeleton h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-rose-800">{error}</p>
        <button
          type="button"
          onClick={() => void loadTeachers()}
          className="focus-ring mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  if (instructors.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-xs">
        <GraduationCap className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-bold text-heading">Chưa có giảng viên nào</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Khám phá các khóa học đang mở để kết nối và học tập cùng đội ngũ giảng viên của EduAlto.
        </p>
        <Link
          href="/courses"
          className="focus-ring mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Khám phá khóa học
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-heading">Đội ngũ giảng viên EduAlto</h2>
          <p className="mt-0.5 text-xs text-muted">
            Nhắn tin trực tiếp để được tư vấn bài học và định hướng lộ trình phù hợp.
          </p>
        </div>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Tìm giảng viên</span>
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên hoặc chuyên môn..."
            className="focus-ring h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
          />
        </label>
      </div>

      {visibleInstructors.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-muted">Không tìm thấy giảng viên phù hợp từ khóa.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleInstructors.map((instructor) => {
            const taughtCourses = enrolledCoursesByInstructor[instructor.id] ?? [];
            return (
              <article
                key={instructor.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-200 hover:shadow-soft"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <UserAvatar
                      name={instructor.fullName}
                      avatarUrl={instructor.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-base font-bold text-heading">
                          {instructor.fullName}
                        </h3>
                        {taughtCourses.length > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Đang theo học
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                        {instructor.headline || instructor.expertise || "Giảng viên chuyên môn"}
                      </p>
                    </div>
                  </div>

                  {instructor.experienceYears !== null ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Award className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      {instructor.experienceYears} năm kinh nghiệm giảng dạy
                    </p>
                  ) : null}

                  {instructor.specialties ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">
                      Chuyên môn: {instructor.specialties}
                    </p>
                  ) : null}

                  {taughtCourses.length > 0 ? (
                    <div className="mt-3 rounded-xl bg-emerald-50/70 p-2.5 text-xs text-emerald-900">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        Khóa học bạn đã ghi danh:
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-emerald-800">
                        {taughtCourses.join(" · ")}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveInstructor(instructor);
                      setMessageBody("");
                      setSendError("");
                    }}
                    className="focus-ring inline-flex h-9.5 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-dark"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Nhắn tin</span>
                  </button>
                  <Link
                    href={`/courses?instructorId=${encodeURIComponent(instructor.id)}`}
                    className="focus-ring inline-flex h-9.5 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-heading hover:bg-slate-50"
                  >
                    Khóa học
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {activeInstructor ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-chat-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="start-chat-title" className="text-base font-bold text-heading">
                  Nhắn tin tới {activeInstructor.fullName}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Tin nhắn đầu tiên sẽ mở cuộc trò chuyện trực tiếp với giảng viên.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại nhắn tin"
                onClick={() => setActiveInstructor(null)}
                className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form
              onSubmit={(event) => void handleStartConversation(event)}
              className="mt-4 space-y-3"
            >
              <label
                htmlFor="teacher-first-message"
                className="block text-xs font-semibold text-heading"
              >
                Nội dung tin nhắn
              </label>
              <textarea
                id="teacher-first-message"
                rows={4}
                maxLength={4000}
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder={`Xin chào ${activeInstructor.fullName}, mình muốn hỏi thêm về...`}
                className="focus-ring w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              {sendError ? (
                <p role="alert" className="text-xs font-medium text-rose-600">
                  {sendError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveInstructor(null)}
                  className="focus-ring h-9.5 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-heading hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="focus-ring inline-flex h-9.5 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{sending ? "Đang gửi…" : "Gửi tin nhắn"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
