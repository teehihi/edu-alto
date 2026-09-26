"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Twitter } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { CourseCard } from "@/components/course/course-card";
import { FeatureCard } from "@/components/marketing/feature-card";
import {
  blogPosts,
  courseCategories,
  features,
  instructors,
  popularCourses,
  testimonials,
} from "@/constants/home";
import { cn } from "@/lib/cn";

export function HomePage() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);

  const filteredCourses = useMemo(() => {
    let result = popularCourses;

    if (selectedCategory !== "all") {
      result = result.filter((course) => course.accent === selectedCategory);
    }

    if (query) {
      const normalizedQuery = query.toLocaleLowerCase("vi");
      result = result.filter((course) =>
        [course.title, course.category, course.description, course.instructor].some((value) =>
          value.toLocaleLowerCase("vi").includes(normalizedQuery),
        ),
      );
    }

    return result;
  }, [query, selectedCategory]);

  const activeTestimonial = testimonials[activeTestimonialIndex] ?? testimonials[0];

  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      <main>
        <section className="relative overflow-hidden bg-[#fbfffd] pt-8 lg:pt-12">
          <HeroBackgroundPatterns />
          <div className="container-page grid min-h-[620px] items-center gap-10 pb-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative z-10">
              <h1 className="max-w-[650px] text-[44px] font-extrabold capitalize leading-[1.18] text-ink sm:text-[56px] lg:text-[62px]">
                Nâng Tầm <span className="text-primary">Kỹ Năng</span>
                <br />
                <span className="text-primary">Bứt Phá</span> Sự Nghiệp
              </h1>
              <p className="mt-6 max-w-[540px] text-sm leading-7 text-[#667085] sm:text-base">
                Nền tảng học tập trực tuyến hiện đại, cung cấp khóa học và tài liệu chất lượng giúp
                bạn nâng cao kiến thức và phát triển kỹ năng.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="#courses"
                  className="focus-ring inline-flex h-[58px] items-center justify-center rounded-lg border border-primary bg-primary px-8 text-base font-semibold text-white shadow-xs transition duration-200 hover:bg-primary-dark hover:shadow-soft active:bg-primary-dark"
                >
                  Khám phá ngay
                </Link>
                <Link
                  href="#about"
                  className="focus-ring inline-flex h-[58px] items-center justify-center rounded-lg border border-primary-soft bg-primary-soft px-8 text-base font-semibold text-primary transition duration-200 hover:bg-[#d9fff3] active:bg-[#c8f7ec]"
                >
                  Trải nghiệm miễn phí
                </Link>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-8 text-sm font-semibold text-[#101828]">
                <div className="flex items-center gap-3">
                  <Image
                    src="/icons/home/book 1.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                  <span>Nội Dung Đa Dạng</span>
                </div>
                <div className="flex items-center gap-3">
                  <Image
                    src="/icons/home/people 1.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                  <span>Học Tập Cá Nhân Hoá</span>
                </div>
                <div className="flex items-center gap-3">
                  <Image
                    src="/icons/home/chart 1.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6"
                  />
                  <span>Tiến Bộ Mỗi Ngày</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mx-auto flex h-[480px] w-full max-w-[560px] items-center justify-center sm:h-[540px]">
              {/* Green circular base with student image from Figma */}
              <div className="relative flex h-[380px] w-[380px] items-end justify-center overflow-hidden rounded-full bg-primary shadow-xl sm:h-[460px] sm:w-[460px]">
                <Image
                  src="/images/home/students.png"
                  alt="Sinh viên EduAlto"
                  width={520}
                  height={546}
                  priority
                  className="translate-y-6 object-contain transition duration-500 hover:scale-105"
                />
              </div>

              {/* Floating green dot from Figma */}
              <span
                className="absolute bottom-6 left-4 h-10 w-10 animate-pulse rounded-full bg-primary shadow-md"
                aria-hidden="true"
              />

              {/* Card 02: 5K+ Khóa học */}
              <div className="absolute -right-2 top-4 hidden w-[188px] animate-float flex-col items-center rounded-[20px] border border-slate-100/90 bg-white/95 p-4 text-center shadow-soft backdrop-blur-sm transition hover:scale-105 sm:flex">
                <Image
                  src="/icons/home/Ring.svg"
                  alt=""
                  width={72}
                  height={72}
                  className="h-16 w-16"
                />
                <p className="mt-2 text-2xl font-bold text-ink">5K+</p>
                <p className="mt-0.5 text-xs font-semibold text-muted">Khóa Học Trực Tuyến</p>
              </div>

              {/* Card 03: 2K+ Video */}
              <div className="absolute -left-6 top-1/3 hidden h-[88px] w-[220px] animate-floatSlow items-center gap-3.5 rounded-2xl border border-slate-100/90 bg-white/95 p-3.5 shadow-soft backdrop-blur-sm transition hover:scale-105 sm:flex">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary shadow-xs">
                  <Image
                    src="/icons/home/Online Education.svg"
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-ink">2K+</p>
                  <p className="text-xs font-semibold text-muted">Video Khóa Học</p>
                </div>
              </div>

              {/* Card 01: 250+ Giảng viên */}
              <div className="absolute -right-2 bottom-6 hidden h-[84px] w-[176px] animate-float items-center gap-3 rounded-2xl border border-slate-100/90 bg-white/95 p-3.5 shadow-soft backdrop-blur-sm transition hover:scale-105 sm:flex">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary shadow-xs">
                  <Image
                    src="/icons/home/Board.svg"
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted">Giảng Viên</p>
                  <p className="text-2xl font-bold text-ink">250+</p>
                </div>
              </div>
            </div>
          </div>

          {/* Partners section */}
          <div className="container-page pb-16 pt-4">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-14">
              <div className="shrink-0 text-center md:text-left">
                <p className="text-3xl font-extrabold text-primary">250+</p>
                <p className="mt-0.5 text-lg font-semibold text-muted">Đối Tác</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-14">
                <Image
                  src="/icons/home/Group.svg"
                  alt="duolingo"
                  width={153}
                  height={36}
                  className="h-8 w-auto object-contain grayscale opacity-70 transition duration-300 hover:grayscale-0 hover:opacity-100 hover:scale-105"
                />
                <Image
                  src="/icons/home/Codecov (logo — Black).svg"
                  alt="Codecov"
                  width={186}
                  height={36}
                  className="h-8 w-auto object-contain grayscale opacity-70 transition duration-300 hover:grayscale-0 hover:opacity-100 hover:scale-105"
                />
                <Image
                  src="/icons/home/UserTesting (logo — Black).svg"
                  alt="UserTesting"
                  width={140}
                  height={36}
                  className="h-8 w-auto object-contain grayscale opacity-70 transition duration-300 hover:grayscale-0 hover:opacity-100 hover:scale-105"
                />
                <Image
                  src="/icons/home/Magic Leap (logo — Black).svg"
                  alt="Magic Leap"
                  width={234}
                  height={36}
                  className="h-8 w-auto object-contain grayscale opacity-70 transition duration-300 hover:grayscale-0 hover:opacity-100 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="container-page scroll-mt-24 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-bold text-primary">Có gì tại EduAlto</p>
            <h2 className="mt-3 text-[34px] font-bold leading-tight text-ink sm:text-[40px]">
              Xây dựng môi trường học tập vui nhộn và hấp dẫn
            </h2>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Image
              src="/icons/home/Group 521.svg"
              alt=""
              width={96}
              height={12}
              className="h-3 w-auto"
            />
          </div>
        </section>

        <section id="courses" className="container-page scroll-mt-24 py-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-primary">Khám phá EduAlto</p>
              <h2 className="mt-3 text-[34px] font-bold leading-tight text-ink sm:text-[40px]">
                Khóa học phổ biến
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                Hãy tham gia lớp học nổi tiếng của chúng tôi, kiến thức được cung cấp chắc chắn sẽ
                hữu ích cho bạn.
              </p>
            </div>

            {/* Interactive Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {courseCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "focus-ring rounded-lg px-4 py-2 text-xs font-semibold transition duration-200",
                    selectedCategory === category.id
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 text-muted hover:bg-slate-200/80 hover:text-ink",
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {query ? <p className="mt-5 text-sm text-muted">Kết quả tìm kiếm cho “{query}”</p> : null}

          <div className="mt-10 grid gap-7 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {filteredCourses.length === 0 ? (
            <div className="mt-12 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 px-6 py-10 text-center">
              <p className="text-base font-semibold text-ink">Chưa tìm thấy khóa học phù hợp</p>
              <p className="mt-2 text-sm text-muted">
                Hãy thử chọn danh mục khác hoặc thay đổi từ khóa tìm kiếm.
              </p>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="focus-ring mt-5 inline-flex h-10 items-center rounded-lg border border-primary bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Xem tất cả khóa học
              </button>
            </div>
          ) : null}

          <div className="mt-12 flex justify-center">
            <Link
              href="#courses"
              className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-7 text-sm font-semibold text-ink shadow-xs transition duration-200 hover:border-primary hover:bg-slate-50 hover:text-primary active:bg-slate-100"
            >
              Xem Tất Cả Khóa Học
            </Link>
          </div>
        </section>

        <section id="instructors" className="container-page scroll-mt-24 py-20 text-center">
          <p className="text-sm font-bold text-primary">Đội Ngũ Giảng Viên</p>
          <h2 className="mt-3 text-[34px] font-bold leading-tight text-ink sm:text-[40px]">
            Những Người Đồng Hành
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted">
            Đội ngũ giảng viên giàu kinh nghiệm tại EduAlto, mang đến những kiến thức và kỹ năng
            thiết thực cho người học.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {instructors.map((instructor) => (
              <article
                key={instructor.name}
                className="group rounded-2xl border border-slate-100/80 bg-[#f8fafb] px-7 py-10 text-center transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-cardHover"
              >
                <Image
                  src={instructor.image}
                  alt={instructor.name}
                  width={80}
                  height={80}
                  className="mx-auto h-20 w-20 rounded-full object-cover shadow-sm ring-2 ring-primary/20 transition group-hover:ring-primary/40"
                />
                <h3 className="mt-6 text-base font-bold text-ink">{instructor.name}</h3>
                <p className="mt-1 text-sm font-semibold text-primary">{instructor.role}</p>
                <p className="mx-auto mt-3 min-h-[64px] max-w-[220px] text-sm leading-6 text-muted">
                  {instructor.description}
                </p>
                <div className="mt-6 flex justify-center gap-4 text-slate-400">
                  <Twitter className="h-4 w-4 transition hover:text-primary" aria-hidden="true" />
                  <span className="text-sm font-bold transition hover:text-primary">in</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Testimonial Section with interactive carousel switch */}
        <section className="bg-[#eefbf7] py-24 text-center">
          <div className="container-page">
            <Image
              src="/images/logo-with-text.png"
              alt="EduAlto"
              width={98}
              height={55}
              className="mx-auto h-14 w-auto object-contain"
            />
            <blockquote className="mx-auto mt-9 max-w-5xl text-[28px] font-bold leading-[1.35] text-ink sm:text-[38px] lg:text-[42px]">
              &ldquo;{activeTestimonial.quote}&rdquo;
            </blockquote>
            <Image
              src={activeTestimonial.avatar}
              alt={activeTestimonial.author}
              width={64}
              height={64}
              className="mx-auto mt-10 h-16 w-16 rounded-full object-cover shadow-md ring-2 ring-primary/30"
            />
            <p className="mt-4 text-base font-bold text-ink">{activeTestimonial.author}</p>
            <p className="mt-1 text-sm text-muted">{activeTestimonial.role}</p>

            {/* Interactive dots */}
            <div className="mt-8 flex justify-center gap-2">
              {testimonials.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Xem đánh giá của ${item.author}`}
                  onClick={() => setActiveTestimonialIndex(index)}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-300",
                    activeTestimonialIndex === index
                      ? "w-8 bg-primary"
                      : "w-2.5 bg-primary/30 hover:bg-primary/50",
                  )}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="container-page py-20">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Bài Viết Gần Đây</h2>
          <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_1.22fr]">
            <div className="grid gap-8">
              {blogPosts
                .filter((post) => !post.featured)
                .map((post) => (
                  <BlogSmallCard key={post.title} post={post} />
                ))}
            </div>
            {blogPosts
              .filter((post) => post.featured)
              .map((post) => (
                <BlogFeaturedCard key={post.title} post={post} />
              ))}
          </div>
        </section>
      </main>
      <div id="contact" className="scroll-mt-24">
        <Footer />
      </div>
    </div>
  );
}

function HeroBackgroundPatterns() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Left concentric rings centered behind heading */}
      <div className="absolute -left-16 top-6 h-[540px] w-[540px] sm:left-[-30px] lg:left-[2%] lg:top-[30px]">
        <svg className="h-full w-full" viewBox="0 0 540 540" fill="none">
          <circle
            cx="270"
            cy="270"
            r="100"
            stroke="#20B486"
            strokeWidth="1.2"
            strokeOpacity="0.22"
          />
          <circle
            cx="270"
            cy="270"
            r="165"
            stroke="#20B486"
            strokeWidth="1.2"
            strokeOpacity="0.18"
          />
          <circle
            cx="270"
            cy="270"
            r="225"
            stroke="#20B486"
            strokeWidth="1.2"
            strokeOpacity="0.14"
          />
          <circle
            cx="270"
            cy="270"
            r="265"
            stroke="#20B486"
            strokeWidth="1.2"
            strokeOpacity="0.08"
          />
          {/* Green dots on left rings */}
          <circle cx="50" cy="180" r="6" fill="#20B486" />
          <circle cx="140" cy="425" r="6" fill="#20B486" />
        </svg>
      </div>

      {/* Right concentric rings centered behind student circle */}
      <div className="absolute -right-20 top-2 h-[820px] w-[820px] sm:right-[-20px] lg:right-[1%] lg:top-[10px]">
        <svg className="h-full w-full" viewBox="0 0 820 820" fill="none">
          <circle
            cx="410"
            cy="410"
            r="245"
            stroke="#20B486"
            strokeWidth="1.2"
            strokeOpacity="0.25"
          />
          <circle
            cx="410"
            cy="410"
            r="305"
            stroke="#20B486"
            strokeWidth="1.2"
            strokeOpacity="0.19"
          />
          <circle
            cx="410"
            cy="410"
            r="365"
            stroke="#20B486"
            strokeWidth="1.2"
            strokeOpacity="0.14"
          />
          <circle
            cx="410"
            cy="410"
            r="405"
            stroke="#20B486"
            strokeWidth="1.2"
            strokeOpacity="0.08"
          />
          {/* Green dots on right rings */}
          <circle cx="560" cy="765" r="5" fill="#20B486" />
          <circle cx="155" cy="740" r="7" fill="#20B486" fillOpacity="0.5" />
        </svg>
      </div>
    </div>
  );
}

function BlogSmallCard({ post }: { post: (typeof blogPosts)[number] }) {
  return (
    <article className="grid gap-6 sm:grid-cols-[320px_1fr]">
      <Image
        src={post.image}
        alt={post.title}
        width={318}
        height={198}
        className="h-[198px] w-full object-cover sm:w-[318px]"
      />
      <div>
        <p className="text-sm font-bold text-primary">{post.date}</p>
        <h3 className="mt-2 text-lg font-bold leading-7 text-ink">{post.title}</h3>
        <p className="mt-3 text-sm leading-6 text-muted">{post.description}</p>
        <TagList tags={post.tags} />
      </div>
    </article>
  );
}

function BlogFeaturedCard({ post }: { post: (typeof blogPosts)[number] }) {
  return (
    <article>
      <Image
        src={post.image}
        alt={post.title}
        width={590}
        height={342}
        className="h-[342px] w-full object-cover"
      />
      <p className="mt-7 text-sm font-bold text-primary">{post.date}</p>
      <h3 className="mt-2 text-2xl font-bold leading-8 text-ink">{post.title}</h3>
      <p className="mt-3 text-base leading-7 text-muted">{post.description}</p>
      <TagList tags={post.tags} />
    </article>
  );
}

function TagList({ tags }: { tags: readonly string[] }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <span
          key={tag}
          className={`rounded px-2 py-1 text-xs font-bold ${
            index === 0
              ? "bg-[#fff3d8] text-[#f59e0b]"
              : index === 1
                ? "bg-[#ede9fe] text-[#7c3aed]"
                : "bg-[#ffe4f3] text-[#db2777]"
          }`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
