"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Copy, FileText, LockKeyhole, Play, X } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { enrollInCourse } from "@/lib/learning-client";
import { addCourseToCart } from "@/lib/cart";
import {
  fetchPublicCourseBySlug,
  fetchPublicCourses,
  fetchPublicCurriculum,
  fetchLessonPreview,
} from "@/lib/course-client";
import type { CourseDetail, CourseListItem, CourseCurriculum, LessonPreview } from "@/types/course";

const levels = {
  ALL_LEVELS: "Tất cả trình độ",
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};
const sections = [
  ["description", "Mô tả"],
  ["instructor", "Người hướng dẫn"],
  ["curriculum", "Giáo trình"],
  ["reviews", "Đánh giá"],
];
const money = (value: number) =>
  value === 0 ? "Miễn phí" : `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
const duration = (seconds: number) => `${Math.ceil(seconds / 60)} phút`;

function DesignIcon({ name }: { name: "chevron-right" | "chevron-down" | "globe" }) {
  return (
    <Image
      src={`/images/course-detail/${name}.svg`}
      alt=""
      width={24}
      height={24}
      className="shrink-0"
    />
  );
}

function CourseThumbnail({ url, title }: { url: string | null; title: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-footer-secondary">
      {url && failedUrl !== url ? (
        <Image
          unoptimized
          src={url}
          alt={title}
          fill
          sizes="(min-width: 1024px) 356px, 100vw"
          className="object-cover"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <BookOpen className="h-14 w-14 text-primary" aria-label="Khóa học chưa có ảnh bìa" />
      )}
    </div>
  );
}

export function CourseDetailPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { user, getAccessToken } = useAuthSession();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    course?: CourseDetail;
    error?: string;
    missing?: boolean;
  } | null>(null);
  const [curriculum, setCurriculum] = useState<CourseCurriculum | null>(null);
  const [curriculumError, setCurriculumError] = useState(false);
  const [related, setRelated] = useState<CourseListItem[]>([]);
  const [activeSection, setActiveSection] = useState("description");
  const [shareMessage, setShareMessage] = useState("");
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    fetchPublicCourseBySlug(slug)
      .then((course) => {
        if (active) setResult({ attempt, course });
      })
      .catch((error) => {
        if (active)
          setResult({
            attempt,
            missing: error instanceof ApiClientError && error.status === 404,
            error: "Không thể tải khóa học. Vui lòng thử lại.",
          });
      });
    fetchPublicCurriculum(slug)
      .then((data) => {
        if (active) {
          setCurriculum(data);
          setCurriculumError(false);
        }
      })
      .catch(() => {
        if (active) setCurriculumError(true);
      });
    fetchPublicCourses({ size: 5 })
      .then((data) => {
        if (active) setRelated(data.filter((course) => course.slug !== slug).slice(0, 4));
      })
      .catch(() => {
        if (active) setRelated([]);
      });
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  const loading = !result || result.attempt !== attempt;
  const course = result?.course;
  const lessons = curriculum?.sections.flatMap((section) => section.lessons) ?? [];
  const totalSeconds = lessons.reduce((total, lesson) => total + (lesson.durationSeconds ?? 0), 0);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("Đã sao chép liên kết khóa học.");
    } catch {
      setShareMessage("Không thể sao chép. Bạn có thể sao chép địa chỉ trên thanh trình duyệt.");
    }
  }

  async function enroll() {
    if (!course) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/courses/${course.slug}`)}`);
      return;
    }
    if (!user.roles.includes("STUDENT")) {
      setEnrollmentMessage("Chức năng ghi danh dành cho tài khoản học viên.");
      return;
    }
    setEnrollmentLoading(true);
    setEnrollmentMessage("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await enrollInCourse(token, course.id);
      router.push(`/learning/courses/${course.id}`);
    } catch (error) {
      setEnrollmentMessage(
        error instanceof Error ? error.message : "Chưa thể ghi danh. Vui lòng thử lại.",
      );
    } finally {
      setEnrollmentLoading(false);
    }
  }

  function addToCart() {
    if (!course) return;
    addCourseToCart({
      id: course.id,
      slug: course.slug,
      title: course.title,
      price: course.price,
      thumbnailUrl: course.thumbnailUrl,
      instructorName: course.instructor?.fullName ?? "Giảng viên EduAlto",
    });
    setCartMessage("Đã thêm khóa học vào giỏ hàng.");
  }

  function buyNow() {
    if (!course || course.price <= 0) return;
    addToCart();
    router.push("/checkout");
  }

  function openPreview(id: string) {
    setPreviewId(id);
    dialogRef.current?.showModal();
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-white text-heading">
      <div className="bg-gradient-to-b from-[#E6F7F2] to-[#F8FCFB]">
        <AppHeader transparent />
        <main>
          {loading ? (
            <div role="status" className="mx-auto min-h-[480px] max-w-7xl px-6 py-16">
              <p className="text-muted">Đang tải khóa học…</p>
              <div className="mt-8 h-14 w-3/4 animate-pulse rounded-lg bg-primary/10" />
              <div className="mt-6 h-40 animate-pulse rounded-lg bg-primary/5" />
            </div>
          ) : !course ? (
            <div className="mx-auto max-w-7xl px-6 py-24 text-center">
              <h1 className="text-2xl font-bold">
                {result?.missing ? "Không tìm thấy khóa học" : "Chưa thể tải khóa học"}
              </h1>
              <p role="alert" className="my-5 text-muted">
                {result?.missing
                  ? "Khóa học không tồn tại hoặc chưa được công khai."
                  : result?.error}
              </p>
              {!result?.missing && (
                <Button onClick={() => setAttempt((value) => value + 1)}>Thử lại</Button>
              )}
              <Link className="focus-ring ml-4 rounded-lg text-primary underline" href="/courses">
                Khám phá khóa học
              </Link>
            </div>
          ) : (
            <>
              <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-10 sm:px-10 lg:px-20 lg:pb-14 lg:pt-16">
                <Image
                  src="/images/course-detail/dots.svg"
                  width={154}
                  height={154}
                  alt=""
                  className="pointer-events-none absolute right-0 top-6 hidden opacity-50 lg:block"
                />
                <div className="lg:pr-[440px]">
                  <nav
                    aria-label="Đường dẫn"
                    className="mb-8 flex flex-wrap items-center gap-2 text-sm text-slate-600"
                  >
                    <Link href="/" className="focus-ring hover:text-primary">
                      Trang chủ
                    </Link>
                    <DesignIcon name="chevron-right" />
                    <Link href="/courses" className="focus-ring hover:text-primary">
                      Danh mục
                    </Link>
                    <DesignIcon name="chevron-right" />
                    <span className="break-words text-primary" aria-current="page">
                      {course.title}
                    </span>
                  </nav>
                  <h1 className="text-3xl font-bold leading-[1.4] tracking-tight text-primary lg:text-[40px]">
                    {course.title}
                  </h1>
                  {course.tagline && (
                    <p className="mt-4 text-base leading-relaxed text-slate-700">
                      {course.tagline}
                    </p>
                  )}
                  <p className="mt-6 text-sm text-slate-600">
                    {levels[course.level]}
                    {curriculum && ` · ${lessons.length} bài học`}
                    {totalSeconds > 0 && ` · ${duration(totalSeconds)}`}
                  </p>
                  {course.instructor && (
                    <Link
                      href={`/profile/${encodeURIComponent(course.instructor.customHandle || course.instructor.id)}`}
                      className="focus-ring mt-6 inline-flex items-center gap-3 rounded-lg text-sm"
                    >
                      <UserAvatar
                        name={course.instructor.fullName}
                        avatarUrl={course.instructor.avatarUrl}
                      />
                      <span>
                        Tạo bởi{" "}
                        <span className="font-medium text-primary-dark">
                          {course.instructor.fullName}
                        </span>
                      </span>
                    </Link>
                  )}
                  <p className="mt-6 flex items-center gap-3 text-sm text-slate-600">
                    <DesignIcon name="globe" />
                    {course.language === "vi" ? "Tiếng Việt" : course.language}
                  </p>
                </div>
              </div>
              <div className="bg-white">
                <div className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-12 sm:px-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-20">
                  <aside
                    className="order-first self-start rounded-xl border border-slate-200 bg-white shadow-xs lg:order-last lg:-mt-[350px] lg:z-10"
                    aria-label="Thông tin đăng ký khóa học"
                  >
                    <div className="p-6">
                      <CourseThumbnail url={course.thumbnailUrl} title={course.title} />
                      <div className="mt-7 flex flex-wrap items-baseline gap-3">
                        <strong className="text-2xl">{money(course.price)}</strong>
                        {course.originalPrice !== null && course.originalPrice > course.price && (
                          <>
                            <del className="text-lg text-slate-400">
                              {money(course.originalPrice)}
                            </del>
                            <span className="font-semibold text-primary-dark">
                              Giảm {Math.round((1 - course.price / course.originalPrice) * 100)}%
                            </span>
                          </>
                        )}
                      </div>
                      <Button
                        disabled={enrollmentLoading}
                        onClick={course.price === 0 ? enroll : addToCart}
                        className="mt-6 w-full rounded-lg"
                        aria-describedby="enrollment-status"
                      >
                        {enrollmentLoading
                          ? "Đang ghi danh…"
                          : course.price === 0
                            ? "Đăng ký học"
                            : "Thêm vào giỏ hàng"}
                      </Button>
                      {course.price > 0 && (
                        <Button
                          onClick={buyNow}
                          variant="outline"
                          className="mt-4 w-full rounded-lg"
                          aria-describedby="enrollment-status"
                        >
                          Mua ngay
                        </Button>
                      )}
                      <p
                        id="enrollment-status"
                        className="mt-3 text-sm leading-6 text-muted"
                        role={enrollmentMessage ? "alert" : undefined}
                      >
                        {enrollmentMessage ||
                          cartMessage ||
                          (course.price === 0
                            ? "Ghi danh miễn phí để mở giáo trình và lưu tiến độ học tập của bạn."
                            : "Thêm khóa học vào giỏ hàng để xem thông tin thanh toán.")}
                      </p>
                    </div>
                    <div className="border-t border-slate-200 p-6">
                      <h2 className="font-medium">Chia sẻ khóa học</h2>
                      <Button variant="outline" onClick={copyLink} className="mt-3 rounded-lg">
                        <Copy className="h-4 w-4" />
                        Sao chép liên kết
                      </Button>
                      <p role="status" className="mt-2 text-sm text-muted">
                        {shareMessage}
                      </p>
                    </div>
                  </aside>
                  <div className="min-w-0 py-8 lg:py-10">
                    <nav
                      aria-label="Nội dung khóa học"
                      className="mb-6 flex gap-3 overflow-x-auto border-b border-slate-200 pb-6 sm:gap-6"
                    >
                      {sections.map(([id, label]) => (
                        <a
                          key={id}
                          href={`#${id}`}
                          onClick={() => setActiveSection(id)}
                          aria-current={activeSection === id ? "location" : undefined}
                          className={`focus-ring shrink-0 rounded-lg border px-5 py-4 text-sm font-medium transition hover:bg-primary/10 ${activeSection === id ? "border-transparent bg-primary/40" : "border-slate-200 bg-white"}`}
                        >
                          {label}
                        </a>
                      ))}
                    </nav>
                    <section
                      id="description"
                      className="scroll-mt-28 border-b border-slate-200 pb-6"
                    >
                      <h2 className="text-xl font-semibold text-primary">Mô tả khóa học</h2>
                      <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-slate-700">
                        {course.description || "Giảng viên đang cập nhật mô tả khóa học."}
                      </p>
                      <h3 className="mt-6 text-xl font-semibold text-primary">Chứng chỉ</h3>
                      <p className="mt-2 leading-relaxed text-slate-700">
                        Thông tin cấp chứng chỉ sẽ được cập nhật khi khóa học mở đăng ký.
                      </p>
                    </section>
                    <section
                      id="instructor"
                      className="scroll-mt-28 border-b border-slate-200 py-6"
                    >
                      <h2 className="text-xl font-semibold text-primary">Người hướng dẫn</h2>
                      {course.instructor ? (
                        <div className="mt-4">
                          <Link
                            href={`/profile/${encodeURIComponent(course.instructor.customHandle || course.instructor.id)}`}
                            className="focus-ring text-xl font-semibold text-primary-dark hover:underline"
                          >
                            {course.instructor.fullName}
                          </Link>
                          <p className="mt-1 text-slate-600">
                            {course.instructor.headline || "Giảng viên EduAlto"}
                          </p>
                          <div className="mt-4 flex items-center gap-5">
                            <UserAvatar
                              name={course.instructor.fullName}
                              avatarUrl={course.instructor.avatarUrl}
                              size="2xl"
                            />
                            <Link
                              href={`/profile/${encodeURIComponent(course.instructor.customHandle || course.instructor.id)}`}
                              className="focus-ring rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium hover:border-primary"
                            >
                              Xem hồ sơ giảng viên
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-muted">Thông tin giảng viên đang được cập nhật.</p>
                      )}
                    </section>
                    <section
                      id="curriculum"
                      className="scroll-mt-28 border-b border-slate-200 py-6"
                    >
                      <h2 className="text-xl font-semibold text-primary">Nội dung khóa học</h2>
                      {curriculumError ? (
                        <div role="alert" className="mt-4 rounded-lg border border-rose-200 p-5">
                          <p>Không thể tải giáo trình. Vui lòng thử lại.</p>
                          <Button
                            variant="outline"
                            className="mt-3"
                            onClick={() => setAttempt((value) => value + 1)}
                          >
                            Tải lại giáo trình
                          </Button>
                        </div>
                      ) : !curriculum ? (
                        <p role="status" className="mt-4 text-muted">
                          Đang tải giáo trình…
                        </p>
                      ) : curriculum.sections.length === 0 ? (
                        <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-6 text-muted">
                          Giáo trình đang được cập nhật.
                        </p>
                      ) : (
                        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                          {curriculum.sections.map((section) => (
                            <details
                              key={section.id}
                              className="group border-b border-slate-200 last:border-b-0"
                            >
                              <summary className="focus-ring flex cursor-pointer list-none items-center gap-4 p-5 hover:bg-footer">
                                <span className="transition group-open:rotate-180">
                                  <DesignIcon name="chevron-down" />
                                </span>
                                <h3 className="flex-1 text-base font-semibold">{section.title}</h3>
                                <span className="shrink-0 text-xs text-muted">
                                  {section.lessons.length} bài học
                                </span>
                              </summary>
                              <ul className="border-t border-slate-100 bg-slate-50/60">
                                {section.lessons.map((lesson) => (
                                  <li
                                    key={lesson.id}
                                    className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm"
                                  >
                                    <FileText className="h-4 w-4 shrink-0 text-muted" />
                                    <span className="min-w-0 flex-1">{lesson.title}</span>
                                    {lesson.durationSeconds !== null &&
                                      lesson.durationSeconds > 0 && (
                                        <span className="text-xs text-muted">
                                          {duration(lesson.durationSeconds)}
                                        </span>
                                      )}
                                    {lesson.preview ? (
                                      <button
                                        className="focus-ring flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-primary-dark hover:bg-primary/10 active:bg-primary/20"
                                        onClick={() => openPreview(lesson.id)}
                                      >
                                        <Play className="h-3 w-3" />
                                        Học thử
                                      </button>
                                    ) : (
                                      <LockKeyhole
                                        className="h-4 w-4 text-muted"
                                        aria-label="Bài học dành cho học viên đã đăng ký"
                                      />
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ))}
                        </div>
                      )}
                    </section>
                    <section id="reviews" className="scroll-mt-28 py-6">
                      <h2 className="text-xl font-semibold text-primary">Đánh giá của học viên</h2>
                      <p className="mt-4 rounded-lg border border-slate-200 p-6 text-muted">
                        Chưa có đánh giá được công bố cho khóa học này.
                      </p>
                    </section>
                  </div>
                </div>
                {related.length > 0 && (
                  <section className="border-t border-slate-100 bg-footer/50 px-5 py-12 sm:px-10 lg:px-20">
                    <div className="mx-auto max-w-[1280px]">
                      <h2 className="mb-6 text-xl font-semibold text-primary">
                        Khóa học bạn có thể quan tâm
                      </h2>
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {related.map((item) => (
                          <Link
                            key={item.id}
                            href={`/courses/${item.slug}`}
                            className="focus-ring rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:shadow-soft"
                          >
                            <CourseThumbnail url={item.thumbnailUrl} title={item.title} />
                            <h3 className="mt-4 font-semibold">{item.title}</h3>
                            <p className="mt-2 text-sm text-muted">
                              {item.instructor?.fullName || "Giảng viên EduAlto"}
                            </p>
                            <p className="mt-4 text-lg font-semibold">{money(item.price)}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
        </main>
      </div>
      <Footer />
      <dialog
        ref={dialogRef}
        onClose={() => setPreviewId(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-auto rounded-xl border border-slate-200 p-6 text-heading shadow-xl backdrop:bg-heading/50"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold" id="preview-title">
            Học thử miễn phí
          </h2>
          <button
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="focus-ring rounded-lg p-2 hover:bg-slate-100"
            aria-label="Đóng bài học thử"
          >
            <X />
          </button>
        </div>
        {previewId && <PreviewContent key={previewId} slug={slug} lessonId={previewId} />}
      </dialog>
    </div>
  );
}

function PreviewContent({ slug, lessonId }: { slug: string; lessonId: string }) {
  const [data, setData] = useState<LessonPreview | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetchLessonPreview(slug, lessonId)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [slug, lessonId]);
  if (error) return <p role="alert">Không thể mở bài học thử. Vui lòng đóng và thử lại.</p>;
  if (!data) return <p role="status">Đang tải bài học thử…</p>;
  return (
    <article>
      <h3 className="mb-4 text-xl font-semibold text-primary">{data.title}</h3>
      <p className="whitespace-pre-line leading-relaxed text-slate-700">
        {data.textContent || "Nội dung bài học đang được cập nhật."}
      </p>
    </article>
  );
}
