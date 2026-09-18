import Image from "next/image";
import { ArrowUpRight, Clock3, Star } from "lucide-react";
import { useState } from "react";
import type { Course } from "@/types/course";
import { cn } from "@/lib/cn";

const accentClass: Record<Course["accent"], string> = {
  design: "text-primary",
  coding: "text-primary",
  vibe: "text-primary"
};

export function CourseCard({ course }: { course: Course }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-cardHover">
      <div className="relative h-[238px] overflow-hidden bg-slate-100">
        <Image
          src={course.image}
          alt={course.title}
          fill
          sizes="(min-width: 1024px) 31vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition duration-500 ease-out group-hover:scale-105"
        />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#667085] shadow-xs backdrop-blur-sm">
          <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {course.duration}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className={cn("text-xs font-semibold", accentClass[course.accent])}>{course.category}</p>
        <div className="mt-3 flex items-start gap-4">
          <h3 className="flex-1 text-[21px] font-bold leading-7 text-ink">{course.title}</h3>
          <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-ink transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </div>
        <p className="mt-3 min-h-[54px] text-sm leading-6 text-muted">{course.description}</p>

        <div className="mt-3 flex items-center gap-2 text-sm">
          {course.rating > 0 ? (
            <>
              <span className="font-medium text-primary">{course.rating.toFixed(1)}</span>
              <span className="flex text-orange-400" aria-label={`${course.rating} sao`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </span>
              <span className="text-slate-400">({course.reviewCount})</span>
            </>
          ) : (
            <span className="inline-flex items-center rounded bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-dark">
              {course.reviewCount}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <div className="flex items-center gap-3">
            {course.instructorAvatar ? (
              <Image
                src={course.instructorAvatar}
                alt={course.instructor}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary shadow-inner">
                {course.instructor.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-ink">{course.instructor}</p>
              <p className="text-sm text-muted">{course.joinedAt}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="whitespace-nowrap text-[26px] font-bold text-[#3fc89e]">{course.price}</p>
            <button type="button" onClick={() => setIsPreviewOpen(true)} className="focus-ring mt-1 text-xs font-semibold text-primary underline-offset-2 hover:underline">Xem chi tiết</button>
          </div>
        </div>
      </div>
      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-5" role="presentation" onMouseDown={() => setIsPreviewOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby={`${course.id}-title`} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-primary">{course.category}</p>
                <h3 id={`${course.id}-title`} className="mt-2 text-xl font-bold text-ink">{course.title}</h3>
              </div>
              <button type="button" aria-label="Đóng xem trước khóa học" onClick={() => setIsPreviewOpen(false)} className="focus-ring rounded-md px-2 text-2xl leading-none text-muted hover:text-ink">×</button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">{course.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-primary-soft p-3"><dt className="text-muted">Thời lượng</dt><dd className="mt-1 font-semibold text-ink">{course.duration}</dd></div>
              <div className="rounded-lg bg-primary-soft p-3"><dt className="text-muted">Giảng viên</dt><dd className="mt-1 font-semibold text-ink">{course.instructor}</dd></div>
            </dl>
            <p className="mt-5 text-sm text-muted">Đây là bản xem trước khóa học. Tính năng đăng ký học sẽ được mở khi module khóa học hoàn thiện.</p>
          </section>
        </div>
      ) : null}
    </article>
  );
}
