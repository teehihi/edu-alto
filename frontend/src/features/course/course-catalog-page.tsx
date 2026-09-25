"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Heart,
  SlidersHorizontal,
  Star,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { fetchPublicCourses } from "@/lib/course-client";
import type { CourseListItem } from "@/types/course";
import { cn } from "@/lib/cn";

const SORT_OPTIONS: CustomSelectOption[] = [
  { value: "price_desc", label: "Giá từ cao đến thấp" },
  { value: "price_asc", label: "Giá từ thấp đến cao" },
  { value: "newest", label: "Mới nhất" },
  { value: "rating_desc", label: "Đánh giá cao nhất" }
];

// Helper for formatting Vietnamese currency
function formatVND(amount: number): string {
  if (!amount || amount === 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(amount).replace("₫", "đ");
}

// 9 Default Catalog Courses matching Figma layout
const DEFAULT_CATALOG_COURSES: CourseCatalogCardData[] = [
  {
    id: "course-1",
    slug: "nhap-mon-thiet-ke-ui-ux-chuyen-nghiep",
    title: "Nhập môn Thiết kế UI/UX Chuyên Nghiệp",
    instructor: "ThS. Phạm Văn Hậu",
    instructorRole: "Senior Product Designer",
    rating: 5.0,
    reviewCount: 1200,
    totalHours: 22,
    lecturesCount: 155,
    level: "Cơ bản",
    price: 499000,
    originalPrice: 899000,
    image: "/images/home/course-figma.png"
  },
  {
    id: "course-2",
    slug: "300-bai-code-thieu-nhi-lap-trinh-backend",
    title: "300 Bài Code Thiếu Nhi - Lập Trình Backend",
    instructor: "Kỹ sư Nguyễn Nhật Thiên",
    instructorRole: "Tech Lead EduAlto",
    rating: 5.0,
    reviewCount: 1450,
    totalHours: 26,
    lecturesCount: 180,
    level: "Cơ bản",
    price: 799000,
    originalPrice: 1299000,
    image: "/images/home/course-code.png"
  },
  {
    id: "course-3",
    slug: "lam-chu-ai-agent-vibe-coding-2026",
    title: "Làm Chủ AI Agent & Vibe Coding 2026",
    instructor: "Công Ank",
    instructorRole: "AI Specialist",
    rating: 4.9,
    reviewCount: 890,
    totalHours: 18,
    lecturesCount: 120,
    level: "Nâng cao",
    price: 599000,
    originalPrice: 990000,
    image: "/images/home/course-vibe.png"
  },
  {
    id: "course-4",
    slug: "kien-truc-microservices-voi-spring-boot-3",
    title: "Kiến trúc Microservices với Spring Boot 3",
    instructor: "TS. Nguyễn Thành Sơn",
    instructorRole: "Trưởng bộ môn Hệ thống",
    rating: 5.0,
    reviewCount: 1120,
    totalHours: 32,
    lecturesCount: 210,
    level: "Nâng cao",
    price: 899000,
    originalPrice: 1500000,
    image: "/images/home/blog-workspace.png"
  },
  {
    id: "course-5",
    slug: "thiet-ke-design-system-toan-dien-figma",
    title: "Thiết Kế Design System Toàn Diện Trên Figma",
    instructor: "ThS. Phạm Văn Hậu",
    instructorRole: "Senior Product Designer",
    rating: 4.9,
    reviewCount: 960,
    totalHours: 20,
    lecturesCount: 140,
    level: "Trung cấp",
    price: 650000,
    originalPrice: 990000,
    image: "/images/home/course-figma.png"
  },
  {
    id: "course-6",
    slug: "lap-trinh-fullstack-nextjs-spring-boot",
    title: "Lập trình Fullstack Next.js & Spring Boot",
    instructor: "Kỹ sư Nguyễn Nhật Thiên",
    instructorRole: "Tech Lead EduAlto",
    rating: 5.0,
    reviewCount: 1850,
    totalHours: 38,
    lecturesCount: 260,
    level: "Trung cấp",
    price: 1199000,
    originalPrice: 1899000,
    image: "/images/home/course-code.png"
  },
  {
    id: "course-7",
    slug: "toi-uu-trai-nghiem-nguoi-dung-ux-research",
    title: "Tối Ưu Trải Nghiệm Người Dùng (UX Research)",
    instructor: "Lê Quốc Khánh",
    instructorRole: "UX Lead",
    rating: 4.8,
    reviewCount: 740,
    totalHours: 16,
    lecturesCount: 110,
    level: "Cơ bản",
    price: 399000,
    originalPrice: 650000,
    image: "/images/home/blog-delight.png"
  },
  {
    id: "course-8",
    slug: "ung-dung-generative-ai-trong-lap-trinh",
    title: "Ứng Dụng Generative AI Trong Lập Trình Hiện Đại",
    instructor: "Công Ank",
    instructorRole: "AI Specialist",
    rating: 5.0,
    reviewCount: 1320,
    totalHours: 24,
    lecturesCount: 165,
    level: "Mọi cấp độ",
    price: 750000,
    originalPrice: 1200000,
    image: "/images/home/course-vibe.png"
  },
  {
    id: "course-9",
    slug: "xay-dung-ung-dung-thoi-gian-thuc-websocket",
    title: "Xây Dựng Ứng Dụng Thời Gian Thực với WebSocket",
    instructor: "TS. Hoàng Văn Dũng",
    instructorRole: "Phó Trưởng khoa CNTT",
    rating: 5.0,
    reviewCount: 1600,
    totalHours: 28,
    lecturesCount: 190,
    level: "Nâng cao",
    price: 850000,
    originalPrice: 1400000,
    image: "/images/home/blog-featured.png"
  }
];

// 8 Famous Instructors with rich info for interactive card
const FAMOUS_INSTRUCTORS = [
  {
    id: "inst-1",
    name: "Thầy Hoàng Văn Dũng",
    role: "Phó Trưởng khoa CNTT",
    department: "ĐH Sư Phạm Kỹ Thuật",
    bio: "Hơn 15 năm giảng dạy kiến trúc mạng máy tính, phân tích thiết kế hệ thống và ứng dụng thời gian thực.",
    specialties: ["Hệ thống mạng", "WebSocket", "Kiến trúc hệ thống"],
    rating: 4.9,
    students: "3.400 Học viên",
    coursesCount: 12,
    image: "/images/home/instructor-dung.png",
    badge: "Giảng viên xuất sắc"
  },
  {
    id: "inst-2",
    name: "TS. Nguyễn Thành Sơn",
    role: "Trưởng bộ môn Hệ thống",
    department: "Khoa CNTT - ĐH SPKT",
    bio: "Chuyên gia đầu ngành về cơ sở dữ liệu lớn, tối ưu hóa truy vấn PostgreSQL và kiến trúc Microservices Spring Boot.",
    specialties: ["Spring Boot", "Microservices", "PostgreSQL"],
    rating: 4.9,
    students: "3.400 Học viên",
    coursesCount: 8,
    image: "/images/home/instructor-son.png",
    badge: "Chuyên gia CSDL"
  },
  {
    id: "inst-3",
    name: "ThS. Trần Mạnh Hùng",
    role: "Giảng viên Cao cấp",
    department: "Bộ môn Công nghệ phần mềm",
    bio: "Tâm huyết truyền cảm hứng lập trình cho hàng ngàn sinh viên, phương pháp giải thuật trực quan, thực chiến.",
    specialties: ["C/C++", "Cấu trúc dữ liệu", "Thuật toán"],
    rating: 4.8,
    students: "2.900 Học viên",
    coursesCount: 15,
    image: "/images/home/instructor-hung.png",
    badge: "Được yêu thích nhất"
  },
  {
    id: "inst-4",
    name: "TS. Đặng Thị Minh Tuấn",
    role: "Phó Trưởng khoa CNTT",
    department: "Bộ môn Khoa học dữ liệu",
    bio: "Nhà nghiên cứu xuất sắc với nhiều công trình AI, Machine Learning ứng dụng trong giáo dục và công nghiệp.",
    specialties: ["Machine Learning", "Python", "Data Science"],
    rating: 4.9,
    students: "3.100 Học viên",
    coursesCount: 10,
    image: "/images/home/instructor-tuan.png",
    badge: "Giảng viên ưu tú"
  },
  {
    id: "inst-5",
    name: "ThS. Phạm Văn Hậu",
    role: "Product Design Lead",
    department: "Senior UI/UX Designer",
    bio: "Hơn 8 năm kinh nghiệm thiết kế trải nghiệm người dùng cho hệ sinh thái Fintech và các dự án EdTech quy mô lớn.",
    specialties: ["Figma Design", "Design System", "UX Research"],
    rating: 5.0,
    students: "4.200 Học viên",
    coursesCount: 9,
    image: "/images/home/author-hau.png",
    badge: "Top Rated UI/UX"
  },
  {
    id: "inst-6",
    name: "Kỹ sư Nguyễn Nhật Thiên",
    role: "Tech Lead EduAlto",
    department: "Senior Fullstack Engineer",
    bio: "Chuyên gia kiến trúc hệ thống hiện đại với Next.js, Java Spring Boot và hệ sinh thái cloud tối ưu hiệu năng cao.",
    specialties: ["Next.js", "Java Spring Boot", "Clean Architecture"],
    rating: 5.0,
    students: "5.800 Học viên",
    coursesCount: 14,
    image: "/images/home/author-tee.png",
    badge: "Senior Architect"
  },
  {
    id: "inst-7",
    name: "Chuyên gia Công Ank",
    role: "AI & Vibe Coding Specialist",
    department: "AI Innovation Lab",
    bio: "Tiên phong ứng dụng AI Agent, Prompt Engineering và Vibe Coding giúp lập trình viên tăng x10 năng suất công việc.",
    specialties: ["AI Agents", "Vibe Coding", "LLM Prompting"],
    rating: 4.9,
    students: "2.600 Học viên",
    coursesCount: 6,
    image: "/images/home/author-ank.png",
    badge: "AI Innovator"
  },
  {
    id: "inst-8",
    name: "ThS. Lê Quốc Khánh",
    role: "Senior UX Researcher",
    department: "Usability Specialist",
    bio: "Chuyên gia phân tích hành vi người dùng, tối ưu hóa tỷ lệ chuyển đổi và trải nghiệm tương tác số đa nền tảng.",
    specialties: ["UX Audit", "User Journey", "A/B Testing"],
    rating: 4.8,
    students: "2.100 Học viên",
    coursesCount: 7,
    image: "/images/home/testimonial-khanh.png",
    badge: "UX Mentor"
  }
];

// 8 Related Courses for Carousel
const RELATED_COURSES: CourseCatalogCardData[] = [
  {
    id: "rel-1",
    slug: "design-system-figma-nang-cao",
    title: "Design System & Figma Tokens Nâng Cao",
    instructor: "ThS. Phạm Văn Hậu",
    rating: 5.0,
    reviewCount: 1200,
    totalHours: 22,
    lecturesCount: 155,
    level: "Nâng cao",
    price: 499000,
    originalPrice: 890000,
    image: "/images/home/course-figma.png"
  },
  {
    id: "rel-2",
    slug: "300-bai-code-thieu-nhi-thuc-chien",
    title: "300 Bài Code Thiếu Nhi - Thực Chiến Dự Án",
    instructor: "Kỹ sư Nguyễn Nhật Thiên",
    rating: 5.0,
    reviewCount: 2100,
    totalHours: 30,
    lecturesCount: 220,
    level: "Cơ bản",
    price: 799000,
    originalPrice: 1200000,
    image: "/images/home/course-code.png"
  },
  {
    id: "rel-3",
    slug: "ky-nang-vibe-coder-ai-automation",
    title: "Kỹ năng Vibe Coder & Tự Động Hóa Với AI",
    instructor: "Công Ank",
    rating: 4.9,
    reviewCount: 950,
    totalHours: 16,
    lecturesCount: 98,
    level: "Mọi cấp độ",
    price: 360000,
    originalPrice: 600000,
    image: "/images/home/course-vibe.png"
  },
  {
    id: "rel-4",
    slug: "ux-mapping-research-methods",
    title: "Phương pháp UX Mapping & Phân Tích Người Dùng",
    instructor: "Lê Quốc Khánh",
    rating: 4.8,
    reviewCount: 680,
    totalHours: 14,
    lecturesCount: 85,
    level: "Trung cấp",
    price: 450000,
    originalPrice: 750000,
    image: "/images/home/blog-workspace.png"
  },
  {
    id: "rel-5",
    slug: "bao-mat-ung-dung-web-pentest",
    title: "Bảo Mật Ứng Dụng Web & Kiểm Thử Xâm Nhập",
    instructor: "TS. Hoàng Văn Dũng",
    rating: 5.0,
    reviewCount: 1350,
    totalHours: 26,
    lecturesCount: 175,
    level: "Nâng cao",
    price: 890000,
    originalPrice: 1600000,
    image: "/images/home/blog-featured.png"
  },
  {
    id: "rel-6",
    slug: "xay-dung-giao-dien-responsive-tailwind",
    title: "Xây Dựng Giao Diện Responsive Với Tailwind CSS",
    instructor: "ThS. Phạm Văn Hậu",
    rating: 4.9,
    reviewCount: 1100,
    totalHours: 18,
    lecturesCount: 125,
    level: "Cơ bản",
    price: 390000,
    originalPrice: 590000,
    image: "/images/home/blog-delight.png"
  }
];

type CourseCatalogCardData = {
  id: string;
  slug: string;
  title: string;
  instructor: string;
  instructorRole?: string;
  rating: number;
  reviewCount: number;
  totalHours: number;
  lecturesCount: number;
  level: string;
  price: number;
  originalPrice?: number;
  image: string;
};

export function CourseCatalogPage() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") ?? searchParams.get("keyword") ?? "";

  const [keyword, _setKeyword] = useState(queryParam);
  const [selectedSort, setSelectedSort] = useState<string>("price_desc");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Accordion toggles
  const [isRatingOpen, setIsRatingOpen] = useState(true);
  const [isChaptersOpen, setIsChaptersOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);

  // Filter values
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<string[]>(["15-20"]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("ALL");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [backendCourses, setBackendCourses] = useState<CourseListItem[]>([]);
  const [_loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const loadBackendCourses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPublicCourses({
        keyword: keyword.trim() || undefined,
        sort: selectedSort === "price_desc" ? "price_desc" : selectedSort === "price_asc" ? "price_asc" : "newest",
        page: 0,
        size: 24
      });
      setBackendCourses(data);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedSort]);

  useEffect(() => {
    loadBackendCourses();
  }, [loadBackendCourses]);

  // Merge backend data or fallback to Figma catalog items
  const displayCourses: CourseCatalogCardData[] = useMemo(() => {
    if (backendCourses && backendCourses.length > 0) {
      return backendCourses.map((c, i) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        instructor: c.instructor?.fullName || "Ronald Richards",
        instructorRole: c.instructor?.headline || "Giảng viên EduAlto",
        rating: 5.0,
        reviewCount: 1200 + i * 15,
        totalHours: 22,
        lecturesCount: 155,
        level: c.level === "BEGINNER" ? "Cơ bản" : c.level === "INTERMEDIATE" ? "Trung cấp" : "Nâng cao",
        price: c.price,
        originalPrice: c.originalPrice || undefined,
        image: c.thumbnailUrl || DEFAULT_CATALOG_COURSES[i % DEFAULT_CATALOG_COURSES.length].image
      }));
    }
    return DEFAULT_CATALOG_COURSES;
  }, [backendCourses]);

  function toggleChapterFilter(val: string) {
    setSelectedChapters((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  }

  function toggleCategoryFilter(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between animate-page"
      style={{ background: "linear-gradient(180deg, #E6F7F2 0%, #F2FAF7 320px, #FFFFFF 680px, #FFFFFF 100%)" }}
    >
      <AppHeader transparent />

      <main className="flex-1">
        {/* Decorative Header Banner */}
        <section className="relative pt-6 sm:pt-8 pb-4">
          {/* Subtle Grid Dot Pattern Top-Right (from Figma) */}
          <div className="pointer-events-none absolute right-6 top-4 hidden md:block opacity-40">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <pattern id="dot-pattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#20B486" />
              </pattern>
              <rect width="120" height="120" fill="url(#dot-pattern)" />
            </svg>
          </div>

          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20B486]">
              Danh Sách Khóa Học
            </h1>
            <p className="mt-1 text-sm font-bold text-[#101A2C]">
              Tất Cả Khóa Học
            </p>

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
                  : "hidden"
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
                {/* 1. Xếp hạng (Rating Filter) */}
                <div className="border-b border-slate-100 pb-5">
                  <button
                    type="button"
                    onClick={() => setIsRatingOpen(!isRatingOpen)}
                    className="flex w-full items-center justify-between text-xs font-bold text-[#101A2C] transition hover:text-primary"
                  >
                    <span>Xếp hạng</span>
                    {isRatingOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isRatingOpen && (
                    <div className="mt-3 space-y-2">
                      {[5, 4, 3, 2, 1].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setSelectedRating(selectedRating === stars ? null : stars)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-xs transition",
                            selectedRating === stars ? "bg-primary-soft/60" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-1 text-[#F5C34D]">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  i < stars ? "fill-current text-[#F5C34D]" : "text-slate-200"
                                )}
                              />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Số Chương (Lectures / Chapters) */}
                <div className="border-b border-slate-100 pb-5">
                  <button
                    type="button"
                    onClick={() => setIsChaptersOpen(!isChaptersOpen)}
                    className="flex w-full items-center justify-between text-xs font-bold text-[#101A2C] transition hover:text-primary"
                  >
                    <span>Số Chương</span>
                    {isChaptersOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isChaptersOpen && (
                    <div className="mt-3 space-y-2.5">
                      {["1-10", "10-15", "15-20", "20-25"].map((range) => {
                        const isChecked = selectedChapters.includes(range);
                        return (
                          <label
                            key={range}
                            className="group flex items-center gap-2.5 cursor-pointer text-xs select-none"
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleChapterFilter(range)}
                                className="peer sr-only"
                              />
                              <div
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all duration-150 shadow-2xs",
                                  isChecked
                                    ? "border-primary bg-primary text-white shadow-xs"
                                    : "border-slate-300 bg-white group-hover:border-primary/60"
                                )}
                              >
                                {isChecked && <Check className="h-3 w-3 text-white stroke-[3]" />}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "transition-colors",
                                isChecked ? "font-bold text-[#101A2C]" : "text-slate-600 group-hover:text-slate-900"
                              )}
                            >
                              {range}
                            </span>
                          </label>
                        );
                      })}
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 pt-1"
                      >
                        <span>Xem thêm</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
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
                        { label: "Dưới 500.000đ", val: "<500" },
                        { label: "500.000đ - 1.000.000đ", val: "500-1000" },
                        { label: "Trên 1.000.000đ", val: ">1000" }
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
                                onChange={() => setSelectedPriceRange(item.val)}
                                className="peer sr-only"
                              />
                              <div
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
                                  isSelected
                                    ? "border-primary bg-white ring-2 ring-primary/20"
                                    : "border-slate-300 bg-white group-hover:border-primary/60"
                                )}
                              >
                                {isSelected && (
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "transition-colors",
                                isSelected ? "font-bold text-[#101A2C]" : "text-slate-600 group-hover:text-slate-900"
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

                {/* 4. Danh mục (Category) */}
                <div className="pb-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="flex w-full items-center justify-between text-xs font-bold text-[#101A2C] transition hover:text-primary"
                  >
                    <span>Danh mục</span>
                    {isCategoryOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isCategoryOpen && (
                    <div className="mt-3 space-y-2.5">
                      {[
                        "Thiết kế UI/UX",
                        "Lập trình Web & Backend",
                        "Khoa học Dữ liệu & AI",
                        "Phát triển Mobile",
                        "Marketing & Kinh doanh"
                      ].map((cat) => {
                        const isChecked = selectedCategories.includes(cat);
                        return (
                          <label
                            key={cat}
                            className="group flex items-center gap-2.5 cursor-pointer text-xs select-none"
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCategoryFilter(cat)}
                                className="peer sr-only"
                              />
                              <div
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all duration-150 shadow-2xs",
                                  isChecked
                                    ? "border-primary bg-primary text-white shadow-xs"
                                    : "border-slate-300 bg-white group-hover:border-primary/60"
                                )}
                              >
                                {isChecked && <Check className="h-3 w-3 text-white stroke-[3]" />}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "transition-colors",
                                isChecked ? "font-bold text-[#101A2C]" : "text-slate-600 group-hover:text-slate-900"
                              )}
                            >
                              {cat}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

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
              {/* 3-Column Course Grid from Figma with Vietnamese Currency */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {displayCourses.map((course) => (
                  <FigmaCourseCard key={course.id} course={course} />
                ))}
              </div>

              {/* Pagination Controls from Figma: < 1 2 3 > */}
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition hover:border-primary hover:text-primary shadow-xs"
                  aria-label="Trang trước"
                >
                  &lt;
                </button>
                {[1, 2, 3].map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition shadow-xs",
                      currentPage === page
                        ? "bg-primary text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition hover:border-primary hover:text-primary shadow-xs"
                  aria-label="Trang tiếp"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Các Giảng viên Nổi tiếng (Interactive Luxury Carousel) */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FAFDFB] to-white py-14 border-t border-slate-100">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12">
            <InstructorsCarousel instructors={FAMOUS_INSTRUCTORS} />
          </div>
        </section>

        {/* Section: Các Khóa học liên quan (Interactive Luxury Carousel) */}
        <section className="relative overflow-hidden bg-white py-14 border-t border-slate-100 mb-8">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12">
            <RelatedCoursesCarousel courses={RELATED_COURSES} />
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
function FigmaCourseCard({ course }: { course: CourseCatalogCardData }) {
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100/90 bg-white p-3.5 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardHover hover:border-primary/30">
      {/* Top Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={course.image}
          alt={course.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />

        {/* Favorite heart button */}
        <button
          type="button"
          aria-label="Lưu vào khóa học yêu thích"
          onClick={(e) => {
            e.preventDefault();
            setIsFavorited(!isFavorited);
          }}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 backdrop-blur-xs shadow-xs transition hover:bg-white hover:text-rose-500 active:scale-90"
        >
          <Heart className={cn("h-4 w-4", isFavorited && "fill-rose-500 text-rose-500")} />
        </button>

        {/* Level badge */}
        <span className="absolute left-2.5 top-2.5 rounded-lg bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-800 backdrop-blur-xs shadow-xs">
          {course.level}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col pt-3.5">
        <h3 className="line-clamp-2 text-sm font-bold text-ink transition group-hover:text-primary">
          <Link href={`/courses/${course.slug}`}>
            {course.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-muted">
          Bởi <span className="font-semibold text-slate-700">{course.instructor}</span>
        </p>

        {/* Star Rating Line */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
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
          {course.totalHours} Giờ học, {course.lecturesCount} Bài giảng, {course.level}
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

// ==========================================
// Luxury Interactive Instructors Carousel with Auto-Scroll & Corner Expansion Hover Card
// ==========================================
function InstructorsCarousel({
  instructors
}: {
  instructors: typeof FAMOUS_INSTRUCTORS;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  // Smooth Auto-scroll every 3.5s unless paused by user hover
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft >= scrollWidth - clientWidth - 15) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: 280, behavior: "smooth" });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused]);

  function scroll(direction: "left" | "right") {
    if (scrollRef.current) {
      const cardWidth = 280;
      const scrollAmount = direction === "left" ? -cardWidth * 2 : cardWidth * 2;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header with Title & Navigation Controls */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Đội ngũ chuyên gia hàng đầu</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#101A2C] mt-1">
            Các Giảng viên Nổi tiếng
          </h2>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Giảng viên trước"
            className={cn(
              "focus-ring flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 shadow-xs",
              canScrollLeft
                ? "border-slate-200 bg-white text-slate-800 hover:border-primary hover:bg-primary-soft/50 hover:text-primary hover:scale-105 active:scale-95"
                : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Giảng viên kế tiếp"
            className={cn(
              "focus-ring flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 shadow-xs",
              canScrollRight
                ? "border-slate-200 bg-white text-slate-800 hover:border-primary hover:bg-primary-soft/50 hover:text-primary hover:scale-105 active:scale-95"
                : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Track with Auto-Slide & Hover Interaction */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-6 overflow-x-auto pb-6 pt-2 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {instructors.map((inst) => (
          <div
            key={inst.id}
            className="instructor-hover-card group relative flex h-[380px] w-[270px] sm:w-[290px] shrink-0 snap-start flex-col border border-slate-200/80 p-4 shadow-sm hover:shadow-2xl hover:border-transparent transition-all duration-300"
          >
            {/* FRONT SIDE (Normally visible, smoothly fades on hover) */}
            <div className="relative z-1 flex flex-col h-full transition-all duration-300 group-hover:opacity-0 group-hover:scale-95 pointer-events-auto group-hover:pointer-events-none">
              {/* Photo Container */}
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100 group-hover:ring-primary/30 transition duration-300">
                <Image
                  src={inst.image}
                  alt={inst.name}
                  fill
                  sizes="290px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-bold text-primary backdrop-blur-xs shadow-xs">
                  {inst.coursesCount} Khóa học
                </span>
                <span className="absolute top-2.5 right-2.5 rounded-lg bg-[#101A2C]/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs shadow-xs">
                  {inst.badge}
                </span>
              </div>

              {/* Front Details */}
              <div className="mt-3.5 flex flex-1 flex-col text-center">
                <h3 className="line-clamp-1 text-sm font-bold text-ink transition group-hover:text-primary">
                  {inst.name}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted font-medium">
                  {inst.role}
                </p>

                {/* Bottom Rating & Students */}
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1 text-[#F5C34D]">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-ink font-bold">{inst.rating}</span>
                  </span>
                  <span className="text-muted text-[11px] flex items-center gap-1">
                    <Users className="h-3 w-3 text-slate-400" />
                    {inst.students}
                  </span>
                </div>
              </div>
            </div>

            {/* BACK / REVEALED DETAILS (Revealed on hover via expanded primary corners) */}
            <div className="absolute inset-0 z-20 flex flex-col justify-between p-5 text-white opacity-0 transition-all duration-400 delay-100 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transform translate-y-2 group-hover:translate-y-0">
              {/* Header inside Card */}
              <div>
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white/80">
                    <Image
                      src={inst.image}
                      alt={inst.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold text-white leading-tight">
                      {inst.name}
                    </h4>
                    <p className="truncate text-[11px] font-medium text-emerald-100">
                      {inst.role}
                    </p>
                  </div>
                </div>

                {/* Badge & Specialty Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white border border-white/30">
                    {inst.badge}
                  </span>
                  {inst.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Bio text */}
                <p className="mt-3 text-xs leading-relaxed text-white/95 line-clamp-3">
                  {inst.bio}
                </p>
              </div>

              {/* Stats Bar & Action CTA */}
              <div className="mt-auto border-t border-white/20 pt-3">
                <div className="grid grid-cols-3 gap-1 text-center mb-3">
                  <div className="rounded-lg bg-white/20 py-1.5">
                    <div className="text-xs font-bold text-white">{inst.coursesCount}</div>
                    <div className="text-[9px] text-emerald-100">Khóa học</div>
                  </div>
                  <div className="rounded-lg bg-white/20 py-1.5">
                    <div className="text-xs font-bold text-white">{inst.students.split(" ")[0]}</div>
                    <div className="text-[9px] text-emerald-100">Học viên</div>
                  </div>
                  <div className="rounded-lg bg-white/20 py-1.5">
                    <div className="text-xs font-bold text-white flex items-center justify-center gap-0.5">
                      <Star className="h-3 w-3 fill-[#F5C34D] text-[#F5C34D]" /> {inst.rating}
                    </div>
                    <div className="text-[9px] text-emerald-100">Đánh giá</div>
                  </div>
                </div>

                <Link
                  href={`/courses?search=${encodeURIComponent(inst.name)}`}
                  className="group/btn flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#101A2C] py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#101A2C]/90 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Khám phá khóa học</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover/btn:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Luxury Interactive Related Courses Carousel with Auto-Scroll
// ==========================================
function RelatedCoursesCarousel({
  courses
}: {
  courses: typeof RELATED_COURSES;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  // Auto-scroll every 4.5s unless paused by user hover
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft >= scrollWidth - clientWidth - 15) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: 330, behavior: "smooth" });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused]);

  function scroll(direction: "left" | "right") {
    if (scrollRef.current) {
      const cardWidth = 310;
      const scrollAmount = direction === "left" ? -cardWidth * 2 : cardWidth * 2;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  }

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header with Title & Navigation Controls */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Gợi ý cho bạn</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#101A2C] mt-1">
            Các Khóa học liên quan
          </h2>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Khóa học trước"
            className={cn(
              "focus-ring flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 shadow-xs",
              canScrollLeft
                ? "border-slate-200 bg-white text-slate-800 hover:border-primary hover:bg-primary-soft/50 hover:text-primary hover:scale-105 active:scale-95"
                : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Khóa học kế tiếp"
            className={cn(
              "focus-ring flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200 shadow-xs",
              canScrollRight
                ? "border-slate-200 bg-white text-slate-800 hover:border-primary hover:bg-primary-soft/50 hover:text-primary hover:scale-105 active:scale-95"
                : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Track */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-6 overflow-x-auto pb-6 pt-2 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {courses.map((course) => (
          <div
            key={course.id}
            className="w-[280px] sm:w-[310px] shrink-0 snap-start"
          >
            <FigmaCourseCard course={course} />
          </div>
        ))}
      </div>
    </div>
  );
}

