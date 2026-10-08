"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Heart, RotateCcw, SlidersHorizontal, Star, X } from "lucide-react";
import {
  startTransition,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useSyncExternalStore,
} from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { EnsureQueryClient } from "@/lib/query-provider";
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

interface CatalogFilterFormProps {
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  selectedPriceRange: string;
  setSelectedPriceRange: (range: string) => void;
  isLevelOpen: boolean;
  setIsLevelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isLanguageOpen: boolean;
  setIsLanguageOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isPriceOpen: boolean;
  setIsPriceOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onResetPage: () => void;
}

function CatalogFilterForm({
  selectedLevel,
  setSelectedLevel,
  selectedLanguage,
  setSelectedLanguage,
  selectedPriceRange,
  setSelectedPriceRange,
  isLevelOpen,
  setIsLevelOpen,
  isLanguageOpen,
  setIsLanguageOpen,
  isPriceOpen,
  setIsPriceOpen,
  onResetPage,
}: CatalogFilterFormProps) {
  return (
    <div className="space-y-4">
      {/* 1. Trình độ */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => setIsLevelOpen((prev) => !prev)}
          aria-expanded={isLevelOpen}
          className="flex w-full items-center justify-between py-1 text-sm font-bold text-heading transition hover:text-primary"
        >
          <span>Trình độ</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200 ease-out",
              isLevelOpen && "rotate-180 text-primary",
            )}
          />
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            isLevelOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-1">
              {[
                ["", "Tất cả trình độ"],
                ["BEGINNER", "Cơ bản"],
                ["INTERMEDIATE", "Trung cấp"],
                ["ADVANCED", "Nâng cao"],
                ["ALL_LEVELS", "Mọi trình độ"],
              ].map(([value, label]) => {
                const isSelected = selectedLevel === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "group flex cursor-pointer select-none items-center justify-between rounded-xl px-2.5 py-2 transition-colors",
                      isSelected ? "bg-primary-soft/40" : "hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="course-level"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedLevel(value);
                          onResetPage();
                        }}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 bg-white transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2",
                          isSelected
                            ? "border-primary"
                            : "border-slate-300 group-hover:border-primary/60",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full bg-primary transition-[transform,opacity] duration-150",
                            isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0",
                          )}
                        />
                      </span>
                      <span
                        className={cn(
                          "text-sm transition-colors",
                          isSelected
                            ? "font-bold text-heading"
                            : "text-slate-600 group-hover:text-ink",
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Ngôn ngữ */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => setIsLanguageOpen((prev) => !prev)}
          aria-expanded={isLanguageOpen}
          className="flex w-full items-center justify-between py-1 text-sm font-bold text-heading transition hover:text-primary"
        >
          <span>Ngôn ngữ</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200 ease-out",
              isLanguageOpen && "rotate-180 text-primary",
            )}
          />
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            isLanguageOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-1">
              {[
                ["", "Tất cả ngôn ngữ"],
                ["vi", "Tiếng Việt"],
                ["en", "Tiếng Anh"],
              ].map(([value, label]) => {
                const isSelected = selectedLanguage === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "group flex cursor-pointer select-none items-center justify-between rounded-xl px-2.5 py-2 transition-colors",
                      isSelected ? "bg-primary-soft/40" : "hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="course-language"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedLanguage(value);
                          onResetPage();
                        }}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 bg-white transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2",
                          isSelected
                            ? "border-primary"
                            : "border-slate-300 group-hover:border-primary/60",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full bg-primary transition-[transform,opacity] duration-150",
                            isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0",
                          )}
                        />
                      </span>
                      <span
                        className={cn(
                          "text-sm transition-colors",
                          isSelected
                            ? "font-bold text-heading"
                            : "text-slate-600 group-hover:text-ink",
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Giá */}
      <div className="pb-1">
        <button
          type="button"
          onClick={() => setIsPriceOpen((prev) => !prev)}
          aria-expanded={isPriceOpen}
          className="flex w-full items-center justify-between py-1 text-sm font-bold text-heading transition hover:text-primary"
        >
          <span>Giá</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200 ease-out",
              isPriceOpen && "rotate-180 text-primary",
            )}
          />
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            isPriceOpen ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-1">
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
                    className={cn(
                      "group flex cursor-pointer select-none items-center justify-between rounded-xl px-2.5 py-2 transition-colors",
                      isSelected ? "bg-primary-soft/40" : "hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="priceRange"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedPriceRange(item.val);
                          onResetPage();
                        }}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 bg-white transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2",
                          isSelected
                            ? "border-primary"
                            : "border-slate-300 group-hover:border-primary/60",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full bg-primary transition-[transform,opacity] duration-150",
                            isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0",
                          )}
                        />
                      </span>
                      <span
                        className={cn(
                          "text-sm transition-colors",
                          isSelected
                            ? "font-bold text-heading"
                            : "text-slate-600 group-hover:text-ink",
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100/90 bg-white p-3.5 shadow-xs">
      <div className="aspect-[16/10] w-full animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-3.5 space-y-2.5">
        <div className="h-4 w-4/5 animate-pulse rounded-md bg-slate-100" />
        <div className="h-4 w-3/5 animate-pulse rounded-md bg-slate-100" />
        <div className="h-3 w-2/5 animate-pulse rounded-md bg-slate-100" />
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="h-5 w-24 animate-pulse rounded-md bg-slate-100" />
          <div className="h-3 w-12 animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function CourseCatalogPage() {
  return (
    <EnsureQueryClient>
      <CourseCatalogContent />
    </EnsureQueryClient>
  );
}

function CourseCatalogContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? searchParams.get("keyword") ?? "";

  const keyword = queryParam;
  const [selectedSort, setSelectedSort] = useState<string>("newest");
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Accordion toggles
  const [isLevelOpen, setIsLevelOpen] = useState(true);
  const [isLanguageOpen, setIsLanguageOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);

  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const { user, getAccessToken } = useAuthSession();
  const userId = user?.roles.includes("STUDENT") ? user.id : null;

  useEffect(() => {
    if (!userId) return;
    void getAccessToken().then((token) => {
      if (token) void loadFavoriteCoursesForUser(userId, token);
    });
  }, [getAccessToken, userId]);

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

  const queryParams = useMemo(
    () => ({
      keyword: keyword.trim() || undefined,
      level: selectedLevel ? (selectedLevel as CourseListItem["level"]) : undefined,
      language: selectedLanguage || undefined,
      minPrice,
      maxPrice,
      isFree,
      sort:
        selectedSort === "price_desc"
          ? ("price_desc" as const)
          : selectedSort === "price_asc"
            ? ("price_asc" as const)
            : ("newest" as const),
      page: currentPage - 1,
      size: 12,
    }),
    [
      keyword,
      selectedLevel,
      selectedLanguage,
      minPrice,
      maxPrice,
      isFree,
      selectedSort,
      currentPage,
    ],
  );

  const {
    data: catalogData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["courses", queryParams],
    queryFn: () => fetchPublicCoursePage(queryParams),
    placeholderData: keepPreviousData,
  });

  const courses = catalogData?.data ?? [];
  const totalPages = catalogData?.meta.totalPages ?? 0;
  const isSlowLoading = isFetching && !isLoading;

  const catalog = useMemo(
    () => ({
      courses,
      totalPages,
      error: isError,
    }),
    [courses, totalPages, isError],
  );

  const displayCourses: FavoriteCourse[] = useMemo(
    () =>
      courses.map((c) => ({
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
    [courses],
  );

  function resetPage() {
    setCurrentPage(1);
  }

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedLevel) count++;
    if (selectedLanguage) count++;
    if (selectedPriceRange !== "ALL") count++;
    return count;
  }, [selectedLevel, selectedLanguage, selectedPriceRange]);

  function resetFilters() {
    setSelectedLevel("");
    setSelectedLanguage("");
    setSelectedPriceRange("ALL");
    setCurrentPage(1);
  }

  function handleToggleFilter() {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsDesktopFilterOpen((prev) => !prev);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileDrawerOpen]);

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen flex flex-col justify-between"
      style={{
        background:
          "linear-gradient(180deg, #E6F7F2 0%, #F2FAF7 320px, #FFFFFF 680px, #FFFFFF 100%)",
      }}
    >
      <AppHeader transparent transparentBg="bg-[#E6F7F2]" />

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
                onClick={handleToggleFilter}
                aria-expanded={isDesktopFilterOpen}
                className={cn(
                  "focus-ring group inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-xs transition-all duration-200 active:scale-[0.96]",
                  isDesktopFilterOpen
                    ? "border-primary/40 bg-primary-soft/40 text-primary hover:bg-primary-soft/60"
                    : "border-slate-200 bg-white text-ink hover:border-primary/40 hover:text-primary",
                )}
              >
                <SlidersHorizontal
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isDesktopFilterOpen
                      ? "rotate-90 text-primary"
                      : "text-slate-500 group-hover:text-primary",
                  )}
                />
                <span className="min-w-[4.25rem] text-left">
                  {isDesktopFilterOpen ? "Ẩn bộ lọc" : "Hiện bộ lọc"}
                </span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white shadow-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Xếp theo</span>
                <CustomSelect
                  value={selectedSort}
                  onChange={(sort) => {
                    setSelectedSort(sort);
                    setCurrentPage(1);
                  }}
                  options={SORT_OPTIONS}
                  align="right"
                  buttonClassName="w-[12rem] sm:w-[12.5rem] rounded-xl border-slate-200 bg-white py-2 px-3 text-xs font-bold text-[#101A2C] shadow-xs hover:border-primary"
                  menuClassName="min-w-[13rem] rounded-xl border-slate-100 shadow-xl"
                  aria-label="Sắp xếp khóa học"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Catalog Main Content */}
        <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
          <div className="flex items-start">
            {/* Desktop Filter Sidebar with slide/fade animation */}
            <aside
              className={cn(
                "hidden lg:block shrink-0 overflow-hidden transition-[width,margin,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                isDesktopFilterOpen
                  ? "w-[280px] xl:w-[300px] mr-6 xl:mr-8 opacity-100 visible pointer-events-auto"
                  : "w-0 xl:w-0 mr-0 xl:mr-0 opacity-0 invisible pointer-events-none",
              )}
              aria-hidden={!isDesktopFilterOpen}
            >
              <div
                className={cn(
                  "w-[280px] xl:w-[300px] pr-2 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  isDesktopFilterOpen ? "translate-x-0" : "-translate-x-6",
                )}
              >
                <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#101A2C] flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      <span>Bộ lọc</span>
                    </h3>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                      >
                        Đặt lại ({activeFilterCount})
                      </button>
                    )}
                  </div>

                  <CatalogFilterForm
                    selectedLevel={selectedLevel}
                    setSelectedLevel={setSelectedLevel}
                    selectedLanguage={selectedLanguage}
                    setSelectedLanguage={setSelectedLanguage}
                    selectedPriceRange={selectedPriceRange}
                    setSelectedPriceRange={setSelectedPriceRange}
                    isLevelOpen={isLevelOpen}
                    setIsLevelOpen={setIsLevelOpen}
                    isLanguageOpen={isLanguageOpen}
                    setIsLanguageOpen={setIsLanguageOpen}
                    isPriceOpen={isPriceOpen}
                    setIsPriceOpen={setIsPriceOpen}
                    onResetPage={resetPage}
                  />

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Xóa tất cả bộ lọc</span>
                    </button>
                  )}
                </div>
              </div>
            </aside>

            {/* Mobile Slide-Over Drawer with Backdrop */}
            <div
              className={cn(
                "fixed inset-0 z-50 lg:hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isMobileDrawerOpen ? "visible" : "invisible pointer-events-none",
              )}
              role="dialog"
              aria-modal="true"
              aria-label="Bộ lọc khóa học"
            >
              {/* Backdrop */}
              <div
                className={cn(
                  "fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ease-out",
                  isMobileDrawerOpen ? "opacity-100" : "opacity-0",
                )}
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-hidden="true"
              />

              {/* Drawer Content */}
              <div
                className={cn(
                  "fixed inset-y-0 left-0 flex w-full max-w-xs sm:max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full",
                )}
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5">
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="h-4.5 w-4.5 text-primary" />
                    <h3 className="text-base font-bold text-[#101A2C]">Bộ lọc khóa học</h3>
                    {activeFilterCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all"
                    aria-label="Đóng bộ lọc"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <CatalogFilterForm
                    selectedLevel={selectedLevel}
                    setSelectedLevel={setSelectedLevel}
                    selectedLanguage={selectedLanguage}
                    setSelectedLanguage={setSelectedLanguage}
                    selectedPriceRange={selectedPriceRange}
                    setSelectedPriceRange={setSelectedPriceRange}
                    isLevelOpen={isLevelOpen}
                    setIsLevelOpen={setIsLevelOpen}
                    isLanguageOpen={isLanguageOpen}
                    setIsLanguageOpen={setIsLanguageOpen}
                    isPriceOpen={isPriceOpen}
                    setIsPriceOpen={setIsPriceOpen}
                    onResetPage={resetPage}
                  />
                </div>

                {/* Drawer Sticky Footer Actions */}
                <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4 backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all"
                  >
                    Đặt lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="flex-1 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-sm hover:bg-primary-dark active:scale-[0.98] transition-all"
                  >
                    Áp dụng {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Course Grid */}
            <div className="flex flex-1 flex-col min-w-0">
              {catalog?.error ? (
                <div role="alert" className="rounded-lg border border-rose-200 p-6">
                  <p>Không thể tải danh mục khóa học. Vui lòng thử lại.</p>
                  <button
                    className="focus-ring mt-4 rounded-lg border border-primary px-4 py-2 text-primary"
                    onClick={() => void refetch()}
                  >
                    Thử lại
                  </button>
                </div>
              ) : isLoading ? (
                /* Initial loading skeleton grid */
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <CourseCardSkeleton key={idx} />
                  ))}
                </div>
              ) : displayCourses.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-8 text-muted">
                  Chưa có khóa học phù hợp. Hãy thử tìm kiếm khác.
                </p>
              ) : (
                /* Courses remain rendered during re-sorting/filtering with smooth opacity transition */
                <div
                  className={cn(
                    "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ease-out",
                    isSlowLoading ? "opacity-60 pointer-events-none" : "opacity-100",
                  )}
                >
                  {displayCourses.map((course) => (
                    <FigmaCourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination Controls - Anchored centered relative to the container for zero horizontal jitter */}
          <nav
            aria-label="Điều hướng phân trang khóa học"
            className={cn(
              "mt-12 flex items-center justify-center gap-2 transition-opacity duration-200",
              isSlowLoading && "opacity-60 pointer-events-none",
            )}
            hidden={!catalog || catalog.totalPages < 2}
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
          </nav>
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
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const { user, getAccessToken } = useAuthSession();
  const userId = user?.roles.includes("STUDENT") ? user.id : null;

  const isFavorited = useSyncExternalStore(
    subscribeToFavoriteCourses,
    () =>
      userId
        ? (getCachedFavoriteCourseIds(userId)?.has(course.id) ?? false)
        : readFavoriteCourses().some((favorite) => favorite.id === course.id),
    () => false,
  );

  const [optimisticFavorited, setOptimisticFavorited] = useOptimistic(
    isFavorited,
    (_current, nextState: boolean) => nextState,
  );

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100/90 bg-white p-3.5 shadow-xs transform-gpu transition-all duration-300 ease-out motion-reduce:transition-none motion-safe:hover:-translate-y-1 hover:border-primary/30 hover:shadow-cardHover focus-within:border-primary/30 focus-within:shadow-cardHover">
      {/* Top Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={course.image}
          unoptimized
          alt={course.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out motion-reduce:transition-none motion-safe:group-hover:scale-[1.03]"
        />

        {/* Favorite heart button */}
        <button
          type="button"
          aria-label={
            optimisticFavorited
              ? `Bỏ yêu thích ${course.title}`
              : `Lưu ${course.title} vào yêu thích`
          }
          aria-pressed={optimisticFavorited}
          onClick={(e) => {
            e.preventDefault();
            setFavoriteError("");
            if (userId) {
              startTransition(async () => {
                setOptimisticFavorited(!isFavorited);
                setFavoriteLoading(true);
                try {
                  const token = await getAccessToken();
                  if (!token) throw new Error("Vui lòng đăng nhập lại để lưu khóa học.");
                  await setRemoteFavoriteCourse(userId, course.id, token, !isFavorited);
                } catch {
                  setFavoriteError("Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.");
                } finally {
                  setFavoriteLoading(false);
                }
              });
            } else {
              toggleFavoriteCourse(course);
            }
          }}
          disabled={favoriteLoading}
          className="focus-ring absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 backdrop-blur-xs shadow-xs transition hover:bg-white hover:text-rose-500 active:scale-90 disabled:cursor-wait disabled:opacity-60"
        >
          <Heart className={cn("h-4 w-4", optimisticFavorited && "fill-rose-500 text-rose-500")} />
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
        <h3 className="line-clamp-2 h-10 text-sm font-bold leading-5 text-ink">
          <Link href={`/courses/${course.slug}`} className="transition-colors hover:text-primary">
            {course.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-xs text-muted">
          Bởi <span className="font-semibold text-slate-700">{course.instructor}</span>
        </p>

        {/* Star Rating Line */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs min-h-[1.25rem]">
          {course.reviewCount > 0 ? (
            <>
              <div className="flex text-[#F5C34D]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current text-[#F5C34D]" />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                ({course.reviewCount.toLocaleString("vi-VN")} Đánh giá)
              </span>
            </>
          ) : (
            <span className="text-[11px] font-medium text-slate-400">Chưa có đánh giá</span>
          )}
        </div>

        {/* Meta Info Line */}
        <p className="mt-1.5 truncate text-[11px] font-medium text-slate-500">
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
