"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { EnsureQueryClient } from "@/lib/query-provider";
import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  FileText,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  Play,
  PlayCircle,
  Sparkles,
  Star,
  X as CloseIcon,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { enrollInCourse } from "@/lib/learning-client";
import { addCourseToCart } from "@/lib/cart";
import { CourseReviewSection } from "@/features/course/course-review-section";
import { cn } from "@/lib/cn";
import {
  fetchPublicCourseBySlug,
  fetchPublicCourses,
  fetchPublicCurriculum,
  fetchLessonPreview,
  getCachedCurriculum,
} from "@/lib/course-client";

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
function formatSectionDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours} giờ ${minutes} phút`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
}

function DesignIcon({ name }: { name: "chevron-right" | "chevron-down" | "globe" }) {
  return (
    <Image
      src={`/images/course-detail/${name}.svg`}
      alt=""
      width={20}
      height={20}
      className="shrink-0"
    />
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none">
      <path
        fill="#1877F2"
        d="M36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 8.988 6.598 16.434 15.188 17.781V23.203H10.64V18h4.547v-3.961c0-4.489 2.673-6.969 6.766-6.969 1.96 0 4.01.35 4.01.35v4.408h-2.259c-2.225 0-2.919 1.38-2.919 2.796V18h4.969l-.794 5.203h-4.175V35.78C29.402 34.434 36 26.988 36 18z"
      />
      <path
        fill="#FFFFFF"
        d="M25.727 23.203L26.521 18h-4.969v-3.376c0-1.416.694-2.796 2.919-2.796h2.259V7.42s-2.05-.35-4.01-.35c-4.093 0-6.766 2.48-6.766 6.969V18H10.64v5.203h4.547V35.78a18.15 18.15 0 005.626 0V23.203h4.914z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#24292F">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.37 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.19 0 10.03 0 12s.46 3.81 1.26 5.42l4.02-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.63 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#101A2C">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function CourseThumbnail({
  url,
  title,
  hasPreview,
}: {
  url: string | null;
  title: string;
  hasPreview?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className="group relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#E6F7F2] to-[#D5F2E8] shadow-inner">
      {url && failedUrl !== url ? (
        <Image
          unoptimized
          src={url}
          alt={title}
          fill
          sizes="(min-width: 1024px) 356px, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-primary">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-xs backdrop-blur-xs">
            <BookOpen className="h-7 w-7 text-primary" aria-label="Khóa học chưa có ảnh bìa" />
          </div>
          <span className="text-xs font-semibold text-primary-dark">EduAlto Course</span>
        </div>
      )}
      {hasPreview && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] transition group-hover:bg-black/35">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-transform group-hover:scale-110">
            <Play className="ml-0.5 h-5 w-5 fill-primary text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}

export function CourseDetailPage(props: { slug: string }) {
  return (
    <EnsureQueryClient>
      <CourseDetailPageInner {...props} />
    </EnsureQueryClient>
  );
}

function CourseDetailPageInner({ slug }: { slug: string }) {
  const router = useRouter();
  const { user, getAccessToken } = useAuthSession();
  const [activeSection, setActiveSection] = useState("description");
  const [copied, setCopied] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [cartActionAnimating, setCartActionAnimating] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cartAnimationTimeoutRef = useRef<number | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
    refetch: refetchCourse,
  } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => fetchPublicCourseBySlug(slug),
  });

  const {
    data: curriculum,
    isError: curriculumError,
    refetch: refetchCurriculum,
  } = useQuery({
    queryKey: ["curriculum", slug],
    queryFn: () => fetchPublicCurriculum(slug),
  });

  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(() => {
    const cached = getCachedCurriculum(slug);
    return new Set(cached?.sections[0] ? [cached.sections[0].id] : []);
  });

  const { data: related = [] } = useQuery({
    queryKey: ["related-courses", slug],
    queryFn: async () => {
      const data = await fetchPublicCourses({ size: 5 });
      return data.filter((c) => c.slug !== slug).slice(0, 4);
    },
  });

  useEffect(() => {
    router.prefetch?.("/checkout");
    router.prefetch?.("/cart");
    return () => {
      if (cartAnimationTimeoutRef.current !== null) {
        window.clearTimeout(cartAnimationTimeoutRef.current);
      }
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, [router]);

  const isMissing = courseError instanceof ApiClientError && courseError.status === 404;
  const loading = courseLoading;
  const lessons = curriculum?.sections.flatMap((section) => section.lessons) ?? [];
  const totalSeconds = lessons.reduce((total, lesson) => total + (lesson.durationSeconds ?? 0), 0);

  function toggleSection(sectionId: string) {
    setOpenSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2400);
    } catch {
      setCopied(false);
    }
  }

  function handleShare(platform: "facebook" | "twitter" | "copy") {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    if (platform === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`,
        "_blank",
        "noopener,noreferrer,width=600,height=400",
      );
    } else if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(course?.title || "")}`,
        "_blank",
        "noopener,noreferrer,width=600,height=400",
      );
    } else {
      void copyLink();
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
      lessonCount: lessons.length,
      durationSeconds: totalSeconds,
    });
    setCartMessage("Đã thêm khóa học vào giỏ hàng.");
    setCartActionAnimating(true);
    if (cartAnimationTimeoutRef.current !== null) {
      window.clearTimeout(cartAnimationTimeoutRef.current);
    }
    cartAnimationTimeoutRef.current = window.setTimeout(() => {
      setCartActionAnimating(false);
      cartAnimationTimeoutRef.current = null;
    }, 550);
  }

  function buyNow() {
    if (!course || course.price <= 0 || buyingNow) return;
    setBuyingNow(true);
    addCourseToCart({
      id: course.id,
      slug: course.slug,
      title: course.title,
      price: course.price,
      thumbnailUrl: course.thumbnailUrl,
      instructorName: course.instructor?.fullName ?? "Giảng viên EduAlto",
      lessonCount: lessons.length,
      durationSeconds: totalSeconds,
    });
    router.push("/checkout");
  }

  function openPreview(id: string) {
    setPreviewId(id);
    dialogRef.current?.showModal();
  }

  const hasAnyPreview = lessons.some((lesson) => lesson.preview);

  return (
    <div suppressHydrationWarning className="min-h-screen bg-white text-heading antialiased">
      <div className="bg-gradient-to-b from-[#E6F7F2] via-[#F2FAF7] to-white">
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
              <h1 className="text-2xl font-bold text-heading">
                {isMissing ? "Không tìm thấy khóa học" : "Chưa thể tải khóa học"}
              </h1>
              <p role="alert" className="my-5 text-muted">
                {isMissing
                  ? "Khóa học không tồn tại hoặc chưa được công khai."
                  : "Không thể tải khóa học. Vui lòng thử lại."}
              </p>
              {!isMissing && <Button onClick={() => void refetchCourse()}>Thử lại</Button>}
              <Link className="focus-ring ml-4 rounded-lg text-primary underline" href="/courses">
                Khám phá khóa học
              </Link>
            </div>
          ) : (
            <>
              {/* Hero Banner Section */}
              <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-8 sm:px-10 lg:px-20 lg:pb-16 lg:pt-12">
                <Image
                  src="/images/course-detail/dots.svg"
                  width={154}
                  height={154}
                  alt=""
                  className="pointer-events-none absolute right-4 top-8 hidden opacity-40 lg:block"
                />
                <div className="lg:pr-[440px]">
                  {/* Breadcrumb Navigation */}
                  <nav
                    aria-label="Đường dẫn"
                    className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm"
                  >
                    <Link href="/" className="focus-ring hover:text-primary transition">
                      Trang chủ
                    </Link>
                    <DesignIcon name="chevron-right" />
                    <Link href="/courses" className="focus-ring hover:text-primary transition">
                      Danh mục
                    </Link>
                    <DesignIcon name="chevron-right" />
                    <span className="break-words font-semibold text-primary" aria-current="page">
                      {course.title}
                    </span>
                  </nav>

                  {/* Level Pill */}
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Trình độ: {levels[course.level]}</span>
                  </div>

                  {/* Course Title in Heading Color */}
                  <h1 className="text-3xl font-extrabold leading-[1.3] tracking-tight text-heading sm:text-4xl lg:text-[42px]">
                    {course.title}
                  </h1>

                  {/* Tagline / Subtitle */}
                  {course.tagline && (
                    <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                      {course.tagline}
                    </p>
                  )}

                  {/* Metadata Indicators */}
                  <div className="mt-6 flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5 font-semibold text-heading">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>4.8</span>
                      <span className="font-normal text-muted">(Đánh giá tích cực)</span>
                    </div>
                    {curriculum && (
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span>{lessons.length} bài học</span>
                      </div>
                    )}
                    {totalSeconds > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{duration(totalSeconds)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <DesignIcon name="globe" />
                      <span>{course.language === "vi" ? "Tiếng Việt" : course.language}</span>
                    </div>
                  </div>

                  {/* Instructor Mention */}
                  {course.instructor && (
                    <div className="mt-6 flex items-center gap-3">
                      <UserAvatar
                        name={course.instructor.fullName}
                        avatarUrl={course.instructor.avatarUrl}
                        size="md"
                      />
                      <span className="text-sm text-slate-600">
                        Được tạo bởi{" "}
                        <Link
                          href={`/profile/${encodeURIComponent(course.instructor.customHandle || course.instructor.id)}`}
                          className="font-bold text-heading hover:text-primary transition underline-offset-2 hover:underline"
                        >
                          {course.instructor.fullName}
                        </Link>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content Layout with Sticky Sidebar */}
              <div className="bg-white">
                <div className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-16 sm:px-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-20">
                  {/* Sticky Enrollment Sidebar Card */}
                  <aside
                    className="relative z-20 order-first self-start rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl ring-1 ring-black/5 lg:order-last lg:-mt-[340px]"
                    aria-label="Thông tin đăng ký khóa học"
                  >
                    <CourseThumbnail
                      url={course.thumbnailUrl}
                      title={course.title}
                      hasPreview={hasAnyPreview}
                    />

                    {/* Price section */}
                    <div className="mt-6 flex flex-wrap items-baseline gap-3.5">
                      <strong className="text-3xl font-extrabold text-heading">
                        {money(course.price)}
                      </strong>
                      {course.originalPrice !== null && course.originalPrice > course.price && (
                        <>
                          <del className="text-base font-normal text-slate-400">
                            {money(course.originalPrice)}
                          </del>
                          <span className="text-xl font-bold text-primary">
                            {Math.round(
                              ((course.originalPrice - course.price) / course.originalPrice) * 100,
                            )}
                            % Giảm
                          </span>
                        </>
                      )}
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-6 space-y-3">
                      <Button
                        type="button"
                        disabled={enrollmentLoading}
                        onClick={course.price === 0 ? enroll : addToCart}
                        size="md"
                        className={`focus-ring h-12 w-full rounded-xl text-base font-bold shadow-soft ${
                          cartActionAnimating && course.price > 0 ? "cart-add-pop" : ""
                        }`}
                        aria-label={course.price === 0 ? "Đăng ký học" : "Thêm vào giỏ hàng"}
                        aria-describedby={
                          enrollmentMessage || cartMessage ? "enrollment-status" : undefined
                        }
                      >
                        {enrollmentLoading ? (
                          "Đang ghi danh…"
                        ) : course.price === 0 ? (
                          "Đăng ký học"
                        ) : cartActionAnimating ? (
                          <>
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Đã thêm vào giỏ hàng
                          </>
                        ) : (
                          "Thêm Vào Giỏ Hàng"
                        )}
                      </Button>

                      {course.price > 0 && (
                        <Button
                          type="button"
                          disabled={buyingNow}
                          onClick={buyNow}
                          variant="outline"
                          size="md"
                          className="focus-ring h-12 w-full rounded-xl border border-heading bg-white text-base font-bold text-heading transition duration-150 hover:bg-slate-50 active:scale-[0.98]"
                          aria-label="Mua ngay"
                          aria-describedby={
                            enrollmentMessage || cartMessage ? "enrollment-status" : undefined
                          }
                        >
                          {buyingNow ? (
                            <span className="inline-flex items-center gap-2">
                              <LoaderCircle className="h-4 w-4 animate-spin text-heading" />
                              Đang chuyển trang…
                            </span>
                          ) : (
                            "Mua Ngay"
                          )}
                        </Button>
                      )}
                    </div>

                    {(enrollmentMessage || cartMessage) && (
                      <p
                        id="enrollment-status"
                        className="mt-3 text-xs leading-5 font-semibold text-primary"
                        role={enrollmentMessage ? "alert" : undefined}
                      >
                        {enrollmentMessage || cartMessage}
                      </p>
                    )}

                    {/* Share Section with 5 Social Icons */}
                    <div className="mt-6 border-t border-slate-200/80 pt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-heading">Chia sẻ</h3>
                        {copied && (
                          <span className="text-xs font-semibold text-primary">
                            Đã sao chép liên kết!
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleShare("facebook")}
                          className="focus-ring flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white shadow-xs transition hover:scale-110 hover:shadow-md active:scale-95"
                          aria-label="Chia sẻ qua Facebook"
                          title="Chia sẻ qua Facebook"
                        >
                          <FacebookIcon className="h-7 w-7" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare("copy")}
                          className="focus-ring flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white shadow-xs transition hover:scale-110 hover:shadow-md active:scale-95"
                          aria-label="Sao chép liên kết cho GitHub"
                          title="Sao chép liên kết"
                        >
                          <GitHubIcon className="h-6 w-6" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare("copy")}
                          className="focus-ring flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white shadow-xs transition hover:scale-110 hover:shadow-md active:scale-95"
                          aria-label="Sao chép liên kết Google"
                          title="Sao chép liên kết"
                        >
                          <GoogleIcon className="h-6 w-6" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare("twitter")}
                          className="focus-ring flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white shadow-xs transition hover:scale-110 hover:shadow-md active:scale-95"
                          aria-label="Chia sẻ qua X"
                          title="Chia sẻ qua X"
                        >
                          <XIcon className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare("copy")}
                          className="focus-ring flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white shadow-xs transition hover:scale-110 hover:shadow-md active:scale-95"
                          aria-label="Sao chép liên kết Microsoft"
                          title="Sao chép liên kết"
                        >
                          <MicrosoftIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </aside>

                  {/* Left Column Body with Modern Tabs and Sections */}
                  <div className="min-w-0 py-4 lg:py-6">
                    {/* Tab Navigation */}
                    <nav
                      aria-label="Nội dung khóa học"
                      className="mb-8 flex gap-3 overflow-x-auto pb-1"
                    >
                      {sections.map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setActiveSection(id);
                            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                          }}
                          aria-current={activeSection === id ? "location" : undefined}
                          className={cn(
                            "focus-ring shrink-0 rounded-lg px-6 py-2.5 text-sm font-semibold transition duration-150",
                            activeSection === id
                              ? "bg-primary text-white shadow-xs"
                              : "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </nav>

                    {/* Section 1: Course Description */}
                    <section
                      id="description"
                      className="scroll-mt-28 border-b border-slate-100 pb-10"
                    >
                      <h2 className="text-2xl font-bold text-primary">Mô tả khóa học</h2>
                      <div className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-600">
                        {course.description || "Giảng viên đang cập nhật mô tả khóa học."}
                      </div>
                    </section>

                    {/* Section 2: Instructor */}
                    <section
                      id="instructor"
                      className="scroll-mt-28 border-b border-slate-100 py-10"
                    >
                      <h2 className="text-2xl font-bold text-primary">Người hướng dẫn</h2>
                      <div className="mt-4">
                        <h3 className="text-xl font-bold text-primary">
                          <Link
                            href={
                              course.instructor
                                ? `/profile/${encodeURIComponent(course.instructor.customHandle || course.instructor.id)}`
                                : "#"
                            }
                            className="hover:underline"
                          >
                            {course.instructor?.fullName || "Nguyễn Nhật Thiên (Tee)"}
                          </Link>
                        </h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          {course.instructor?.headline || "Full-Stack Developer"}
                        </p>

                        <div className="mt-5 flex items-center gap-6">
                          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/20">
                            <UserAvatar
                              name={course.instructor?.fullName || "Nguyễn Nhật Thiên"}
                              avatarUrl={course.instructor?.avatarUrl}
                              size="2xl"
                              className="h-24 w-24 rounded-full object-cover"
                            />
                          </div>
                          <div className="space-y-2 text-sm text-slate-700">
                            <div className="flex items-center gap-2.5">
                              <Award className="h-4 w-4 text-slate-700 shrink-0" />
                              <span className="font-medium">24,116 Reviews</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <GraduationCap className="h-4 w-4 text-slate-700 shrink-0" />
                              <span className="font-medium">21505 Students</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <PlayCircle className="h-4 w-4 text-slate-700 shrink-0" />
                              <span className="font-medium">24 Courses</span>
                            </div>
                          </div>
                        </div>

                        <p className="mt-5 text-sm leading-relaxed text-slate-600">
                          {course.instructor?.fullName?.includes("Thiên")
                            ? "Với nhiều năm kinh nghiệm trong lĩnh vực công nghệ và ứng dụng AI, Tee tập trung vào việc đưa các công cụ trí tuệ nhân tạo vào quy trình làm việc thực tế. Anh đã đồng hành cùng nhiều đội ngũ trong việc ứng dụng AI để tối ưu năng suất, sáng tạo nội dung và tự động hóa công việc."
                            : `Với nhiều năm kinh nghiệm trong lĩnh vực chuyên môn, ${course.instructor?.fullName || "giảng viên"} tập trung vào việc đưa các kiến thức và kỹ năng thực tế vào quy trình làm việc. Đồng hành cùng học viên để tối ưu năng suất và phát triển sự nghiệp.`}
                        </p>
                      </div>
                    </section>

                    {/* Section 3: Curriculum Accordion */}
                    <section
                      id="curriculum"
                      className="scroll-mt-28 border-b border-slate-100 py-10"
                    >
                      <h2 className="text-2xl font-bold text-primary">Nội dung Khóa học</h2>

                      {curriculumError ? (
                        <div
                          role="alert"
                          className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/50 p-6"
                        >
                          <p className="font-semibold text-rose-800">
                            Không thể tải giáo trình. Vui lòng thử lại.
                          </p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => void refetchCurriculum()}
                          >
                            Tải lại giáo trình
                          </Button>
                        </div>
                      ) : !curriculum ? (
                        <p role="status" className="mt-6 text-sm text-muted">
                          Đang tải giáo trình…
                        </p>
                      ) : curriculum.sections.length === 0 ? (
                        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-muted">
                          Giáo trình đang được cập nhật.
                        </p>
                      ) : (
                        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white divide-y divide-slate-100 shadow-xs">
                          {curriculum.sections.map((section) => {
                            const isOpen = openSectionIds.has(section.id);
                            const sectionLessons = section.lessons || [];
                            const sectionSeconds = sectionLessons.reduce(
                              (acc, l) => acc + (l.durationSeconds || 0),
                              0,
                            );
                            return (
                              <div key={section.id} className="transition-colors">
                                <button
                                  type="button"
                                  onClick={() => toggleSection(section.id)}
                                  aria-expanded={isOpen}
                                  aria-controls={`section-content-${section.id}`}
                                  id={`section-header-${section.id}`}
                                  className="flex w-full items-center justify-between p-5 text-left transition hover:bg-slate-50/70"
                                >
                                  <div className="flex items-center gap-3 min-w-0 pr-4">
                                    <ChevronDown
                                      className={cn(
                                        "h-5 w-5 shrink-0 text-slate-600 transition-transform duration-200",
                                        isOpen ? "rotate-180" : "rotate-0",
                                      )}
                                    />
                                    <span className="font-bold text-base text-heading truncate">
                                      {section.title}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-4 text-sm text-slate-500 font-medium">
                                    <span>{sectionLessons.length} Bài học</span>
                                    {sectionSeconds > 0 && (
                                      <span>{formatSectionDuration(sectionSeconds)}</span>
                                    )}
                                  </div>
                                </button>

                                {isOpen && (
                                  <div
                                    id={`section-content-${section.id}`}
                                    role="region"
                                    aria-labelledby={`section-header-${section.id}`}
                                    className="bg-slate-50/50 px-5 pb-3 pt-1 divide-y divide-slate-100"
                                  >
                                    {sectionLessons.map((lesson) => (
                                      <div
                                        key={lesson.id}
                                        className="flex flex-wrap items-center gap-3 py-3 text-sm text-slate-700"
                                      >
                                        {lesson.lessonType === "VIDEO" ? (
                                          <Play className="h-4 w-4 shrink-0 text-slate-400" />
                                        ) : (
                                          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                        )}
                                        <span className="min-w-0 flex-1 font-medium text-slate-800 truncate">
                                          {lesson.title}
                                        </span>
                                        {lesson.durationSeconds !== null &&
                                          lesson.durationSeconds > 0 && (
                                            <span className="text-xs text-muted">
                                              {duration(lesson.durationSeconds)}
                                            </span>
                                          )}
                                        {lesson.preview ? (
                                          <button
                                            type="button"
                                            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white active:scale-95"
                                            onClick={() => openPreview(lesson.id)}
                                          >
                                            <Play className="h-3 w-3 fill-current" />
                                            Học thử
                                          </button>
                                        ) : (
                                          <LockKeyhole
                                            className="h-4 w-4 text-slate-400"
                                            aria-label="Bài học dành cho học viên đã đăng ký"
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Section 4: Reviews Section */}
                    <section id="reviews" className="scroll-mt-28 py-10">
                      <h2 className="text-2xl font-bold text-primary">Đánh giá của học viên</h2>
                      <CourseReviewSection courseId={course.id} />
                    </section>
                  </div>
                </div>

                {/* Related Courses Section */}
                {related.length > 0 && (
                  <section className="border-t border-slate-100 bg-[#F5FBF9]/60 px-5 py-14 sm:px-10 lg:px-20">
                    <div className="mx-auto max-w-[1440px]">
                      <div className="mb-8 flex items-end justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">
                            Gợi ý dành cho bạn
                          </span>
                          <h2 className="mt-1 text-2xl font-bold text-heading sm:text-3xl">
                            Khóa học bạn có thể quan tâm
                          </h2>
                        </div>
                        <Link
                          href="/courses"
                          className="focus-ring hidden text-sm font-semibold text-primary hover:underline sm:inline-block"
                        >
                          Xem tất cả khóa học →
                        </Link>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {related.map((item) => (
                          <Link
                            key={item.id}
                            href={`/courses/${item.slug}`}
                            className="focus-ring group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition duration-300 hover:-translate-y-1.5 hover:shadow-cardHover"
                          >
                            <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                              <CourseThumbnail url={item.thumbnailUrl} title={item.title} />
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                              <span className="text-xs font-semibold text-primary">
                                {levels[item.level]}
                              </span>
                              <h3 className="mt-1.5 line-clamp-2 text-base font-bold text-heading group-hover:text-primary transition">
                                {item.title}
                              </h3>
                              <p className="mt-2 text-xs text-muted">
                                {item.instructor?.fullName || "Giảng viên EduAlto"}
                              </p>
                              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-base font-bold text-heading">
                                  {money(item.price)}
                                </span>
                                <span className="text-xs font-semibold text-primary group-hover:underline">
                                  Chi tiết
                                </span>
                              </div>
                            </div>
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
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {previewId && <PreviewContent key={previewId} slug={slug} lessonId={previewId} />}
      </dialog>
    </div>
  );
}

function PreviewContent({ slug, lessonId }: { slug: string; lessonId: string }) {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["lesson-preview", slug, lessonId],
    queryFn: () => fetchLessonPreview(slug, lessonId),
  });

  if (isError) return <p role="alert">Không thể mở bài học thử. Vui lòng đóng và thử lại.</p>;
  if (isLoading || !data) return <p role="status">Đang tải bài học thử…</p>;
  return (
    <article>
      <h3 className="mb-4 text-xl font-semibold text-primary">{data.title}</h3>
      <p className="whitespace-pre-line leading-relaxed text-slate-700">
        {data.textContent || "Nội dung bài học đang được cập nhật."}
      </p>
    </article>
  );
}
