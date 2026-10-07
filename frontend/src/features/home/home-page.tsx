"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Star } from "lucide-react";
import { Twitter } from "@/components/ui/social-icons";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { CourseCard } from "@/components/course/course-card";
import { FeatureCard } from "@/components/marketing/feature-card";
import { Reveal } from "@/components/ui/reveal";
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

  return (
    <div suppressHydrationWarning className="min-h-screen overflow-x-clip bg-white">
      <AppHeader transparent />
      <main>
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#E6F7F2_0%,#F2FAF7_248px,#FFFFFF_608px,#FFFFFF_100%)] pt-6 lg:pt-10">
          <HeroBackgroundPatterns />
          <div className="container-page grid min-h-[620px] items-center gap-10 pb-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative z-10">
              <Reveal>
                <h1 className="max-w-[650px] text-[44px] font-extrabold capitalize leading-[1.18] text-ink sm:text-[56px] lg:text-[62px]">
                  Nâng Tầm <span className="text-primary">Kỹ Năng</span>
                  <br />
                  <span className="text-primary">Bứt Phá</span> Sự Nghiệp
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-6 max-w-[540px] text-sm leading-7 text-[#667085] sm:text-base">
                  Nền tảng học tập trực tuyến hiện đại, cung cấp khóa học và tài liệu chất lượng
                  giúp bạn nâng cao kiến thức và phát triển kỹ năng.
                </p>
              </Reveal>
              <Reveal delay={240} className="mt-8 flex flex-col gap-4 sm:flex-row">
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
              </Reveal>
              <Reveal
                delay={360}
                className="mt-12 flex flex-wrap items-center gap-8 text-sm font-semibold text-[#101828]"
              >
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
              </Reveal>
            </div>

            <Reveal
              direction="scale"
              delay={200}
              duration={1000}
              className="relative z-10 mx-auto flex h-[480px] w-full max-w-[560px] items-center justify-center sm:h-[540px]"
            >
              {/* Green circular base with student image from Figma */}
              <div className="relative flex h-[380px] w-[380px] items-end justify-center overflow-hidden rounded-full bg-primary shadow-xl sm:h-[460px] sm:w-[460px]">
                <Image
                  src="/images/home/students.png"
                  alt="Sinh viên EduAlto"
                  width={520}
                  height={546}
                  priority
                  className="translate-y-6 object-contain"
                />
              </div>

              {/* Floating green dot from Figma */}
              <span
                className="absolute bottom-6 left-4 h-10 w-10 animate-pulse rounded-full bg-primary shadow-md"
                aria-hidden="true"
              />

              {/* Card 02: 5K+ Khóa học */}
              <div className="absolute -right-2 top-4 hidden w-[188px] animate-float flex-col items-center rounded-[20px] border border-slate-100/90 bg-white/95 p-4 text-center shadow-soft backdrop-blur-sm sm:flex">
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
              <div className="absolute -left-6 top-1/3 hidden h-[88px] w-[220px] animate-floatSlow items-center gap-3.5 rounded-2xl border border-slate-100/90 bg-white/95 p-3.5 shadow-soft backdrop-blur-sm sm:flex">
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
              <div className="absolute -right-2 bottom-6 hidden h-[84px] w-[176px] animate-float items-center gap-3 rounded-2xl border border-slate-100/90 bg-white/95 p-3.5 shadow-soft backdrop-blur-sm sm:flex">
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
            </Reveal>
          </div>

          {/* Partners section */}
          <div className="container-page pb-16 pt-4">
            <Reveal className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-14">
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
                  className="h-8 w-auto object-contain grayscale opacity-70"
                />
                <Image
                  src="/icons/home/Codecov (logo — Black).svg"
                  alt="Codecov"
                  width={186}
                  height={36}
                  className="h-8 w-auto object-contain grayscale opacity-70"
                />
                <Image
                  src="/icons/home/UserTesting (logo — Black).svg"
                  alt="UserTesting"
                  width={140}
                  height={36}
                  className="h-8 w-auto object-contain grayscale opacity-70"
                />
                <Image
                  src="/icons/home/Magic Leap (logo — Black).svg"
                  alt="Magic Leap"
                  width={234}
                  height={36}
                  className="h-8 w-auto object-contain grayscale opacity-70"
                />
              </div>
            </Reveal>
          </div>
        </section>

        <section id="about" className="container-page scroll-mt-24 py-20">
          <Reveal className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-bold text-primary">Có gì tại EduAlto</p>
            <h2 className="mt-3 text-[34px] font-bold leading-tight text-ink sm:text-[40px]">
              Xây dựng môi trường học tập vui nhộn và hấp dẫn
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 120} className="h-full">
                <FeatureCard feature={feature} />
              </Reveal>
            ))}
          </div>
          <Reveal direction="fade" delay={300} className="mt-10 flex justify-center">
            <Image
              src="/icons/home/Group 521.svg"
              alt=""
              width={96}
              height={12}
              className="h-3 w-auto"
            />
          </Reveal>
        </section>

        <section id="courses" className="container-page scroll-mt-24 py-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal direction="right">
              <p className="text-sm font-bold text-primary">Khám phá EduAlto</p>
              <h2 className="mt-3 text-[34px] font-bold leading-tight text-ink sm:text-[40px]">
                Khóa học phổ biến
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                Hãy tham gia lớp học nổi tiếng của chúng tôi, kiến thức được cung cấp chắc chắn sẽ
                hữu ích cho bạn.
              </p>
            </Reveal>

            {/* Interactive Category Filter Pills */}
            <Reveal direction="left" delay={150} className="flex flex-wrap gap-2">
              {courseCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selectedCategory === category.id}
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
            </Reveal>
          </div>

          {query ? <p className="mt-5 text-sm text-muted">Kết quả tìm kiếm cho “{query}”</p> : null}

          <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, index) => (
              <Reveal key={course.id} delay={(index % 3) * 120} className="h-full">
                <CourseCard course={course} />
              </Reveal>
            ))}
          </div>

          {filteredCourses.length === 0 ? (
            <Reveal
              direction="scale"
              duration={500}
              className="mt-12 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 px-6 py-10 text-center"
            >
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
            </Reveal>
          ) : null}

          <Reveal className="mt-12 flex justify-center">
            <Link
              href="#courses"
              className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-7 text-sm font-semibold text-ink shadow-xs transition duration-200 hover:border-primary hover:bg-slate-50 hover:text-primary active:bg-slate-100"
            >
              Xem Tất Cả Khóa Học
            </Link>
          </Reveal>
        </section>

        <section id="instructors" className="container-page scroll-mt-24 py-20 text-center">
          <Reveal>
            <p className="text-sm font-bold text-primary">Đội Ngũ Giảng Viên</p>
            <h2 className="mt-3 text-[34px] font-bold leading-tight text-ink sm:text-[40px]">
              Những Người Đồng Hành
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-muted">
              Đội ngũ giảng viên giàu kinh nghiệm tại EduAlto, mang đến những kiến thức và kỹ năng
              thiết thực cho người học.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {instructors.map((instructor, index) => (
              <Reveal key={instructor.name} delay={(index % 4) * 110} className="h-full">
                <article className="group h-full rounded-2xl border border-slate-100/80 bg-[#f8fafb] px-7 py-10 text-center transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-cardHover">
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
                    <a
                      href="https://twitter.com"
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Twitter của ${instructor.name}`}
                      className="focus-ring rounded p-1 transition hover:text-primary"
                    >
                      <Twitter className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <a
                      href="https://linkedin.com"
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`LinkedIn của ${instructor.name}`}
                      className="focus-ring rounded p-1 text-sm font-bold transition hover:text-primary"
                    >
                      in
                    </a>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Testimonials Infinite Marquee */}
        <section className="py-20 text-center">
          <div className="container-page">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-wider text-primary">
                Ý Kiến Học Viên
              </p>
              <h2 className="mt-3 text-[32px] font-bold leading-tight text-ink sm:text-[40px]">
                Được Tin Chọn Bởi Hơn 10.000+ Học Viên
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted">
                Lắng nghe trải nghiệm thực tế từ các học viên đã và đang bứt phá kỹ năng cùng nền
                tảng EduAlto.
              </p>
            </Reveal>

            {/* Container box with matching margins and subtle rounded surface */}
            <div className="marquee-container relative mt-12 overflow-hidden rounded-3xl border border-[#DDEFE9] bg-[#F5FBF9] py-8 shadow-xs">
              {/* Gradient Edge Masks */}
              <div
                className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-[#F5FBF9] to-transparent sm:w-28"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-[#F5FBF9] to-transparent sm:w-28"
                aria-hidden="true"
              />

              {/* Row 1: Leftward (3 unique comments repeated for seamless loop) */}
              <div className="marquee-track-left mb-5 gap-5 px-4">
                {[...testimonials.slice(0, 3), ...testimonials.slice(0, 3)].map((item, idx) => (
                  <TestimonialCard key={`row1-${item.id}-${idx}`} item={item} />
                ))}
              </div>

              {/* Row 2: Rightward (3 unique comments repeated for seamless loop) */}
              <div className="marquee-track-right gap-5 px-4">
                {[...testimonials.slice(3, 6), ...testimonials.slice(3, 6)].map((item, idx) => (
                  <TestimonialCard key={`row2-${item.id}-${idx}`} item={item} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-page py-20">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-wider text-primary">
                Tri Thức & Góc Nhìn
              </p>
              <h2 className="mt-2 text-[32px] font-bold leading-tight text-ink sm:text-[40px]">
                Bài Viết Gần Đây
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <Link
                href="/courses"
                className="focus-ring inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-primary-dark"
              >
                Khám phá tất cả bài viết
                <span aria-hidden="true">→</span>
              </Link>
            </Reveal>
          </div>

          <div className="grid gap-8 items-stretch lg:grid-cols-12">
            {/* Featured Post (7 cols) */}
            <div className="lg:col-span-7">
              {blogPosts
                .filter((post) => post.featured)
                .map((post) => (
                  <Reveal key={post.title} direction="right" delay={120} className="h-full">
                    <BlogFeaturedCard post={post} />
                  </Reveal>
                ))}
            </div>

            {/* List of articles with serial numbers (5 cols) */}
            <div className="flex flex-col justify-between gap-5 lg:col-span-5">
              {blogPosts
                .filter((post) => !post.featured)
                .map((post, index) => (
                  <Reveal
                    key={post.title}
                    direction="left"
                    delay={index * 120 + 150}
                    className="h-full"
                  >
                    <BlogSmallCard post={post} index={index + 1} />
                  </Reveal>
                ))}
            </div>
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

function BlogSmallCard({ post, index }: { post: (typeof blogPosts)[number]; index: number }) {
  return (
    <article className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition duration-300 hover:border-primary/50 hover:bg-[#F5FBF9]/40 hover:shadow-soft">
      <span className="text-3xl font-black text-slate-200 transition duration-300 group-hover:text-primary">
        0{index}
      </span>
      <div className="flex-1">
        <span className="text-xs font-bold text-primary">{post.date}</span>
        <h4 className="mt-1 text-base font-bold leading-snug text-ink transition duration-200 group-hover:text-primary">
          <Link href="/courses">{post.title}</Link>
        </h4>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted line-clamp-2">
          {post.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function BlogFeaturedCard({ post }: { post: (typeof blogPosts)[number] }) {
  return (
    <article className="group relative flex h-full min-h-[380px] sm:min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl border border-slate-200/80 bg-ink shadow-soft transition-all duration-300 hover:shadow-cardHover">
      <Image
        src={post.image}
        alt={post.title}
        fill
        sizes="(max-width: 1024px) 100vw, 60vw"
        className="object-cover opacity-90 transition duration-700 ease-out group-hover:scale-105"
      />
      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/40 to-transparent" />

      <div className="relative z-10 p-6 sm:p-8 text-white">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-md bg-primary px-3 py-1 text-xs font-bold text-white shadow-xs">
            Bài viết nổi bật
          </span>
          <span className="text-xs text-white/80">{post.date}</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold leading-snug text-white transition duration-200 group-hover:text-emerald-200">
          <Link href="/courses">{post.title}</Link>
        </h3>

        <p className="mt-3 text-xs sm:text-sm leading-relaxed text-white/85 line-clamp-3">
          {post.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function TestimonialCard({ item }: { item: (typeof testimonials)[number] }) {
  return (
    <article className="w-[300px] sm:w-[340px] shrink-0 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-xs transition duration-200 hover:border-primary/50 hover:shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-amber-400" aria-label={`${item.rating} sao`}>
          {Array.from({ length: item.rating }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          ))}
        </div>
        <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
          {item.course}
        </span>
      </div>
      <p className="mt-3.5 min-h-[56px] text-xs sm:text-sm leading-6 text-ink">
        &ldquo;{item.quote}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3.5">
        {item.avatar ? (
          <Image
            src={item.avatar}
            alt={item.author}
            width={38}
            height={38}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/20"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
            {item.author.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-xs sm:text-sm font-bold text-ink">{item.author}</p>
          <p className="text-[11px] text-muted">{item.role}</p>
        </div>
      </div>
    </article>
  );
}
