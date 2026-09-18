import { ArrowUpRight, Clock3, Star } from "lucide-react";
import type { Course } from "@/types/course";
import { cn } from "@/lib/cn";

const accentClass: Record<Course["accent"], string> = {
  design: "from-slate-950 via-slate-800 to-primary",
  coding: "from-feature-yellow via-orange-300 to-primary",
  ai: "from-[#4b3b68] via-feature-rose to-primary"
};

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="group flex h-full flex-col rounded-lg bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className={cn("relative h-60 overflow-hidden rounded bg-gradient-to-br", accentClass[course.accent])}>
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_30%),linear-gradient(135deg,transparent_0_40%,rgba(255,255,255,.25)_40%_42%,transparent_42%)]" />
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-80">EduAlto</p>
          <p className="mt-2 text-2xl font-bold leading-tight">{course.category}</p>
        </div>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded bg-white/95 px-2.5 py-1.5 text-xs font-medium text-muted shadow-sm">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {course.duration}
        </span>
      </div>

      <div className="mt-8 flex flex-1 flex-col">
        <p className="text-sm font-semibold text-primary-dark">{course.category}</p>
        <div className="mt-3 flex items-start gap-4">
          <h3 className="flex-1 text-2xl font-semibold leading-8 text-ink">{course.title}</h3>
          <ArrowUpRight className="mt-1 h-6 w-6 shrink-0 text-ink transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </div>
        <p className="mt-3 min-h-12 text-base leading-6 text-muted">{course.description}</p>

        <div className="mt-4 flex items-center gap-2 text-sm">
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

        <div className="mt-auto flex items-end justify-between gap-4 pt-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {course.instructor.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{course.instructor}</p>
              <p className="text-sm text-muted">{course.joinedAt}</p>
            </div>
          </div>
          <p className="whitespace-nowrap text-2xl font-bold text-[#3fc89e]">{course.price}</p>
        </div>
      </div>
    </article>
  );
}
