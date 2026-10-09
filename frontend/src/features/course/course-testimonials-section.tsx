"use client";

import Image from "next/image";
import { useState } from "react";
import { testimonials as homeTestimonials } from "@/constants/home";

type CustomerTestimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
  avatar: string;
};

const featuredTestimonial: CustomerTestimonial = {
  id: "pham-cong-truong",
  quote:
    "“Các khóa học công nghệ trên EduAlto thực sự rất chất lượng! Mình luôn muốn cập nhật những kiến thức mới trong lĩnh vực công nghệ không ngừng thay đổi, và EduAlto đã mang đến nội dung cập nhật cùng trải nghiệm học tập trực quan, hấp dẫn.”",
  author: "Phạm Công Trường",
  role: "Wibu",
  avatar: "/images/course-detail/testimonials/pham-cong-truong.jpg",
};

function mapHomeTestimonial(item: (typeof homeTestimonials)[number]): CustomerTestimonial {
  return {
    id: item.id,
    quote: `“${item.quote}”`,
    author: item.author,
    role: item.role,
    avatar: item.avatar,
  };
}

const testimonialPages: CustomerTestimonial[][] = [
  [0, 1, 2].map((index) => ({ ...featuredTestimonial, id: `${featuredTestimonial.id}-${index}` })),
  homeTestimonials.slice(0, 3).map(mapHomeTestimonial),
  homeTestimonials.slice(3, 6).map(mapHomeTestimonial),
];

function CustomerReviewCard({ review }: { review: CustomerTestimonial }) {
  return (
    <article className="flex min-h-[302px] flex-col gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_0_8px_rgba(59,130,246,0.12)]">
      <Image
        src="/images/course-detail/testimonials/quote-mark.svg"
        alt=""
        aria-hidden="true"
        width={48}
        height={48}
        className="shrink-0"
      />
      <p className="w-full text-base leading-[1.6] text-black">{review.quote}</p>
      <div className="mt-auto flex items-center gap-2">
        {review.avatar ? (
          <Image
            src={review.avatar}
            alt=""
            aria-hidden="true"
            width={60}
            height={60}
            className="h-[60px] w-[60px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary"
          >
            {review.author.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-[1.6] text-[#079367]">{review.author}</p>
          <p className="text-sm leading-[1.5] text-[#334155]">{review.role}</p>
        </div>
      </div>
    </article>
  );
}

export function CourseTestimonialsSection() {
  const [activePage, setActivePage] = useState(0);
  const activeReviews = testimonialPages[activePage] ?? [];

  function showPreviousPage() {
    setActivePage((page) => (page - 1 + testimonialPages.length) % testimonialPages.length);
  }

  function showNextPage() {
    setActivePage((page) => (page + 1) % testimonialPages.length);
  }

  return (
    <section
      role="region"
      aria-labelledby="course-testimonials-heading"
      aria-roledescription="băng chuyền"
      className="bg-[#F8FAFC] py-12 lg:pb-[38px] lg:pt-20"
    >
      <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h2
            id="course-testimonials-heading"
            className="max-w-[308px] text-2xl font-semibold leading-[1.4] text-primary"
          >
            Học Viên Nói Gì Về
            <br />
            EduAlto
          </h2>
          <div className="flex shrink-0 gap-6 self-end sm:mt-[14px]">
            <button
              type="button"
              onClick={showPreviousPage}
              aria-label="Xem đánh giá trước"
              className="focus-ring inline-flex h-10 w-14 items-center justify-center rounded-lg bg-primary/40 transition-colors hover:bg-primary/55 active:scale-95"
            >
              <Image
                src="/images/course-detail/testimonials/chevron-left.svg"
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
              onClick={showNextPage}
              aria-label="Xem đánh giá tiếp theo"
              className="focus-ring inline-flex h-10 w-14 items-center justify-center rounded-lg bg-primary/40 transition-colors hover:bg-primary/55 active:scale-95"
            >
              <Image
                src="/images/course-detail/testimonials/chevron-right.svg"
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
              />
            </button>
          </div>
        </div>

        <div
          key={activePage}
          role="group"
          aria-live="polite"
          aria-label={`Đánh giá học viên, trang ${activePage + 1} trên ${testimonialPages.length}`}
          className="mt-6 grid gap-4 animate-page motion-reduce:animate-none md:grid-cols-3 lg:w-[calc(100%+48px)]"
        >
          {activeReviews.map((review) => (
            <CustomerReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
