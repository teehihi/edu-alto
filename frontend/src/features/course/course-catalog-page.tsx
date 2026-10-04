"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Filter, Heart, SlidersHorizontal, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { fetchPublicCoursePage } from "@/lib/course-client";
import { useAuthSession } from "@/lib/auth-session";
import {
  getCachedFavoriteCourseIds,
  loadFavoriteCoursesForUser,
  readFavoriteCourses,
  setRemoteFavoriteCourse,
  subscribeToFavoriteCourses,
  toggleFavoriteCourse,
  type FavoriteCourse,
} from "@/lib/favorites";
import type { CourseListItem } from "@/types/course";
import { cn } from "@/lib/cn";

const SORT_OPTIONS: CustomSelectOption[] = [
  { value: "price_desc", label: "Giá từ cao đến thấp" },
  { value: "price_asc", label: "Giá từ thấp đến cao" },
  { value: "newest", label: "Mới nhất" },
];

// Helper for formatting Vietnamese currency
function formatVND(amount: number): string {
  if (!amount || amount === 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("₫", "đ");
}

export function CourseCatalogPage() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? searchParams.get("keyword") ?? "";

  const keyword = queryParam;
  const [selectedSort, setSelectedSort] = useState<string>("newest");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Accordion toggles
  const [isLevelOpen, setIsLevelOpen] = useState(true);
  const [isLanguageOpen, setIsLanguageOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);

  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const { minPrice, maxPrice, isFree } = useMemo(() => {
    switch (selectedPriceRange) {
      case "FREE":
        return { isFree: true, minPrice: undefined, maxPrice: undefined };
      case "UNDER_500":
        return { isFree: undefined, minPrice: undefined, maxPrice: 499999 };
      case "500_1000":
        return { isFree: undefined, minPrice: 500000, maxPrice: 1000000 };
      case "OVER_1000":
        return { isFree: undefined, minPrice: 1000001, maxPrice: undefined };
      default:
        return { isFree: undefined, minPrice: undefined, maxPrice: undefined };
    }
  }, [selectedPriceRange]);
  const requestKey = `${keyword}:${selectedSort}:${currentPage}:${selectedLevel}:${selectedLanguage}:${selectedPriceRange}:${retry}`;
  const [catalog, setCatalog] = useState<{
    key: string;
    courses: CourseListItem[];
    totalPages: number;
    error: boolean;
  } | null>(null);
  const loading = catalog?.key !== requestKey;

  useEffect(() => {
    let active = true;
    fetchPublicCoursePage({
      keyword: keyword.trim() || undefined,
      level: selectedLevel ? (selectedLevel as CourseListItem["level"]) : undefined,
      language: selectedLanguage || undefined,
      minPrice,
      maxPrice,
      isFree,
      sort:
        selectedSort === "price_desc"
          ? "price_desc"
          : selectedSort === "price_asc"
            ? "price_asc"
            : "newest",
      page: currentPage - 1,
      size: 12,
    })
      .then((data) => {
        if (active)
          setCatalog({
            key: requestKey,
            courses: data.data,
            totalPages: data.meta.totalPages,
            error: false,
          });
      })
      .catch(() => {
        if (active) setCatalog({ key: requestKey, courses: [], totalPages: 0, error: true });
      });
    return () => {
      active = false;
    };
  }, [
    keyword,
    selectedSort,
    currentPage,
    requestKey,
    selectedLevel,
    selectedLanguage,
    minPrice,
    maxPrice,
    isFree,
  ]);

  const displayCourses: FavoriteCourse[] = useMemo(
    () =>
      (catalog?.courses ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        instructor: c.instructor?.fullName || "Giảng viên EduAlto",
        instructorRole: c.instructor?.headline || undefined,
        rating: 0,
        reviewCount: 0,
        totalHours: 0,
        lecturesCount: 0,
        level:
          c.level === "BEGINNER"
            ? "Cơ bản"
            : c.level === "INTERMEDIATE"
              ? "Trung cấp"
              : c.level === "ADVANCED"
                ? "Nâng cao"
                : "Tất cả trình độ",
        price: c.price,
        originalPrice: c.originalPrice ?? undefined,
        image: c.thumbnailUrl || "/images/logo-with-text.png",
      })),
    [catalog],
  );

  function resetPage() {
    setCurrentPage(1);
  }

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen flex flex-col justify-between animate-page"
      style={{
        background:
          "linear-gradient(180deg, #E6F7F2 0%, #F2FAF7 320px, #FFFFFF 680px, #FFFFFF 100%)",
      }}
    >
      <AppHeader transparent />

      <main className="flex-1">
        {/* Decorative Header Banner */}
        <section className="relative pt-6 sm:pt-8 pb-4">
          {/* Subtle Grid Dot Pattern Top-Right (from Figma) */}
          <div className="pointer-events-none absolute right-6 top-4 hidden md:block opacity-40">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <pattern
                id="dot-pattern"
                x="0"
                y="0"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.5" fill="#20B486" />
              </pattern>
              <rect width="120" height="120" fill="url(#dot-pattern)" />
            </svg>
          </div>

          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20B486]">
              Danh Sách Khóa Học
            </h1>
            <p className="mt-1 text-sm font-bold text-[#101A2C]">Tất Cả Khóa Học</p>

            {/* Filter Button & Sort Row */}
            <div className="relative z-30 mt-6 flex flex-wrap items-center justify-between gap-4">
              {/* Filter Button */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen((prev) => !prev)}
                className="focus-ring inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#101A2C] shadow-xs transition hover:border-primary hover:text-primary active:bg-slate-50"
              >
                <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                <span>Lọc</span>
              </button>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Xếp theo</span>
                <CustomSelect
                  value={selectedSort}
                  onChange={setSelectedSort}
                  options={SORT_OPTIONS}
                  align="right"
                  buttonClassName="rounded-xl border-slate-200 bg-white py-2 px-3 text-xs font-bold text-[#101A2C] shadow-xs hover:border-primary"
                  menuClassName="min-w-[13rem] rounded-xl border-slate-100 shadow-xl"
                  aria-label="Sắp xếp khóa học"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Catalog Main Content */}
        <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
            {/* Left Sidebar Filters */}
            <aside
              className={cn(
                "lg:block",
                isMobileFilterOpen
                  ? "fixed inset-0 z-50 overflow-y-auto bg-white p-6 shadow-2xl lg:static lg:p-0 lg:shadow-none"
                  : "hidden",
              )}
            >
              {/* Mobile Header for Filter Drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 lg:hidden mb-4">
                <h3 className="text-base font-bold text-heading flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span>Bộ lọc khóa học</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Filters backed by the public catalog API */}
                <div className="border-b border-slate-100 pb-5">
                  <button
                    type="button"
                    onClick={() => setIsLevelOpen(!isLevelOpen)}
                    className="flex w-full items-center justify-between text-xs font-bold text-[#101A2C] transition hover:text-primary"
                  >
                    <span>Trình độ</span>
                    {isLevelOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isLevelOpen && (
                    <div className="mt-3 space-y-2">
                      {[
                        ["", "Tất cả trình độ"],
                        ["BEGINNER", "Cơ bản"],
                        ["INTERMEDIATE", "Trung cấp"],
                        ["ADVANCED", "Nâng cao"],
                        ["ALL_LEVELS", "Mọi trình độ"],
                      ].map(([value, label]) => (
                        <label
                          key={value}
                          className="group flex cursor-pointer select-none items-center gap-2.5 text-xs"
                        >
                          <span className="relative flex items-center">
                            <input
                              type="radio"
                              name="course-level"
                              checked={selectedLevel === value}
                              onChange={() => {
                                setSelectedLevel(value);
                                resetPage();
                              }}
                              className="peer sr-only"
                            />
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-white transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30",
                                selectedLevel === value
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-slate-300 group-hover:border-primary/60",
                              )}
                            >
                              {selectedLevel === value && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "transition-colors",
                              selectedLevel === value
                                ? "font-bold text-[#101A2C]"
                                : "text-slate-600 group-hover:text-slate-900",
                            )}
                          >
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Language filter */}
                <div className="border-b border-slate-100 pb-5">
                  <button
                    type="button"
                    onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                    className="flex w-full items-center justify-between text-xs font-bold text-[#101A2C] transition hover:text-primary"
                  >
                    <span>Ngôn ngữ</span>
                    {isLanguageOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isLanguageOpen && (
                    <div className="mt-3 space-y-2.5">
                      {[
                        ["", "Tất cả ngôn ngữ"],
                        ["vi", "Tiếng Việt"],
                        ["en", "Tiếng Anh"],
                      ].map(([value, label]) => (
                        <label
                          key={value}
                          className="group flex cursor-pointer select-none items-center gap-2.5 text-xs"
                        >
                          <span className="relative flex items-center">
                            <input
                              type="radio"
                              name="course-language"
                              checked={selectedLanguage === value}
                              onChange={() => {
                                setSelectedLanguage(value);
                                resetPage();
                              }}
                              className="peer sr-only"
                            />
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-white transition-all duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30",
                                selectedLanguage === value
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-slate-300 group-hover:border-primary/60",
                              )}
                            >
                              {selectedLanguage === value && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "transition-colors",
                              selectedLanguage === value
                                ? "font-bold text-[#101A2C]"
                                : "text-slate-600 group-hover:text-slate-900",
                            )}
                          >
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Giá (Price) */}
                <div className="border-b border-slate-100 pb-5">
                  <button
                    type="button"
                    onClick={() => setIsPriceOpen(!isPriceOpen)}
                    className="flex w-full items-center justify-between text-xs font-bold text-[#101A2C] transition hover:text-primary"
                  >
                    <span>Giá</span>
                    {isPriceOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isPriceOpen && (
                    <div className="mt-3 space-y-2.5">
                      {[
                        { label: "Tất cả mức giá", val: "ALL" },
                        { label: "Miễn phí", val: "FREE" },
                        { label: "Dưới 500.000đ", val: "UNDER_500" },
                        { label: "500.000đ - 1.000.000đ", val: "500_1000" },
                        { label: "Trên 1.000.000đ", val: "OVER_1000" },
                      ].map((item) => {
                        const isSelected = selectedPriceRange === item.val;
                        return (
                          <label
                            key={item.val}
                            className="group flex items-center gap-2.5 cursor-pointer text-xs select-none"
                          >
                            <div className="relative flex items-center">
                              <input
                                type="radio"
                                name="priceRange"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedPriceRange(item.val);
                                  resetPage();
                                }}
                                className="peer sr-only"
                              />
                              <div
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
                                  isSelected
                                    ? "border-primary bg-white ring-2 ring-primary/20"
                                    : "border-slate-300 bg-white group-hover:border-primary/60",
                                )}
                              >
                                {isSelected && <span className="h-2 w-2 rounded-full bg-primary" />}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "transition-colors",
                                isSelected
                                  ? "font-bold text-[#101A2C]"
                                  : "text-slate-600 group-hover:text-slate-900",
                              )}
                            >
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedLevel("");
                    setSelectedLanguage("");
                    setSelectedPriceRange("ALL");
                    setCurrentPage(1);
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Xóa bộ lọc
                </button>

                {/* Mobile Apply Button */}
                <div className="lg:hidden pt-4">
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-xs"
                  >
                    Áp dụng bộ lọc
                  </button>
                </div>
              </div>
            </aside>

            {/* Right Course Grid */}
            <div className="flex flex-col">
              {loading ? (
                <p role="status" className="py-10 text-muted">
                  Đang tải khóa học…
                </p>
              ) : catalog?.error ? (
                <div role="alert" className="rounded-lg border border-rose-200 p-6">
                  <p>Không thể tải danh mục khóa học. Vui lòng thử lại.</p>
                  <button
                    className="focus-ring mt-4 rounded-lg border border-primary px-4 py-2 text-primary"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Thử lại
                  </button>
                </div>
              ) : displayCourses.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-8 text-muted">
                  Chưa có khóa học phù hợp. Hãy thử tìm kiếm khác.
                </p>
              ) : null}
              {/* Course data is shown only after the current request completes. */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {!loading &&
                  displayCourses.map((course) => (
                    <FigmaCourseCard key={course.id} course={course} />
                  ))}
              </div>

              {/* Pagination Controls from Figma: < 1 2 3 > */}
              <div
                className="mt-12 flex items-center justify-center gap-2"
                hidden={loading || !catalog || catalog.totalPages < 2}
              >
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition hover:border-primary hover:text-primary shadow-xs"
                  aria-label="Trang trước"
                >
                  &lt;
                </button>
                {Array.from({ length: catalog?.totalPages ?? 0 }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition shadow-xs",
                        currentPage === page
                          ? "bg-primary text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary",
                      )}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={currentPage >= (catalog?.totalPages ?? 0)}
                  onClick={() => setCurrentPage((p) => Math.min(catalog?.totalPages ?? 1, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition hover:border-primary hover:text-primary shadow-xs"
                  aria-label="Trang tiếp"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ==========================================
// Figma Course Card with VND Currency
// ==========================================
export function FigmaCourseCard({ course }: { course: FavoriteCourse }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteReady, setFavoriteReady] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const { user, getAccessToken } = useAuthSession();
  const userId = user?.roles.includes("STUDENT") ? user.id : null;

  useEffect(() => {
    let active = true;
    const syncFavorite = () =>
      setIsFavorited(
        userId
          ? (getCachedFavoriteCourseIds(userId)?.has(course.id) ?? false)
          : readFavoriteCourses().some((favorite) => favorite.id === course.id),
      );
    syncFavorite();
    const unsubscribe = subscribeToFavoriteCourses(syncFavorite);
    if (userId) {
      void getAccessToken()
        .then((token) => (token ? loadFavoriteCoursesForUser(userId, token) : new Set<string>()))
        .then((ids) => {
          if (active) setIsFavorited(ids.has(course.id));
        })
        .catch(() => {
          if (active) setFavoriteError("Không thể tải danh sách yêu thích.");
        })
        .finally(() => {
          if (active) setFavoriteReady(true);
        });
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [course.id, getAccessToken, userId]);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100/90 bg-white p-3.5 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardHover hover:border-primary/30">
      {/* Top Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={course.image}
          unoptimized
          alt={course.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />

        {/* Favorite heart button */}
        <button
          type="button"
          aria-label={
            isFavorited ? `Bỏ yêu thích ${course.title}` : `Lưu ${course.title} vào yêu thích`
          }
          aria-pressed={isFavorited}
          onClick={(e) => {
            e.preventDefault();
            setFavoriteError("");
            if (userId) {
              setFavoriteLoading(true);
              void getAccessToken()
                .then((token) => {
                  if (!token) throw new Error("Vui lòng đăng nhập lại để lưu khóa học.");
                  return setRemoteFavoriteCourse(userId, course.id, token, !isFavorited);
                })
                .catch(() =>
                  setFavoriteError("Không thể cập nhật danh sách yêu thích. Vui lòng thử lại."),
                )
                .finally(() => setFavoriteLoading(false));
            } else {
              toggleFavoriteCourse(course);
            }
          }}
          disabled={favoriteLoading || (userId !== null && !favoriteReady)}
          className="focus-ring absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 backdrop-blur-xs shadow-xs transition hover:bg-white hover:text-rose-500 active:scale-90 disabled:cursor-wait disabled:opacity-60"
        >
          <Heart className={cn("h-4 w-4", isFavorited && "fill-rose-500 text-rose-500")} />
        </button>
        {favoriteError ? (
          <span
            className="absolute right-2 top-12 max-w-48 rounded-md bg-rose-600 px-2 py-1 text-[10px] font-medium text-white shadow"
            role="status"
          >
            {favoriteError}
          </span>
        ) : null}

        {/* Level badge */}
        <span className="absolute left-2.5 top-2.5 rounded-lg bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-800 backdrop-blur-xs shadow-xs">
          {course.level}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col pt-3.5">
        <h3 className="line-clamp-2 text-sm font-bold text-ink transition group-hover:text-primary">
          <Link href={`/courses/${course.slug}`}>{course.title}</Link>
        </h3>
        <p className="mt-1 text-xs text-muted">
          Bởi <span className="font-semibold text-slate-700">{course.instructor}</span>
        </p>

        {/* Star Rating Line */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs" hidden={course.reviewCount === 0}>
          <div className="flex text-[#F5C34D]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current text-[#F5C34D]" />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            ({course.reviewCount.toLocaleString("vi-VN")} Đánh giá)
          </span>
        </div>

        {/* Meta Info Line */}
        <p className="mt-1.5 text-[11px] font-medium text-slate-500">
          {course.totalHours > 0
            ? `${course.totalHours} giờ học, ${course.lecturesCount} bài giảng, `
            : ""}
          {course.level}
        </p>

        {/* Price in VND */}
        <div className="mt-auto flex items-baseline justify-between border-t border-slate-100 pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-extrabold text-[#101A2C]">
              {formatVND(course.price)}
            </span>
            {course.originalPrice && course.originalPrice > course.price ? (
              <span className="text-xs text-slate-400 line-through">
                {formatVND(course.originalPrice)}
              </span>
            ) : null}
          </div>
          <Link
            href={`/courses/${course.slug}`}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}
