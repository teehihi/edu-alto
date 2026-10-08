"use client";

import { ChevronDown, FileText, LockKeyhole, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { sanitizeCourseDescription } from "@/lib/course-description";

export type CourseCurriculumSectionData = {
  id: string;
  title: string;
  introduction?: string | null;
  description?: string | null;
  lessons: Array<{
    id: string;
    title: string;
    lessonType: string;
    durationSeconds: number | null;
    preview: boolean;
  }>;
};

type CourseCurriculumSectionProps = {
  section: CourseCurriculumSectionData;
  isOpen: boolean;
  onToggle: () => void;
  onPreviewLesson: (lessonId: string) => void;
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours} giờ ${minutes} phút`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
}

export function CourseCurriculumSection({
  section,
  isOpen,
  onToggle,
  onPreviewLesson,
}: CourseCurriculumSectionProps) {
  const sectionLessons = section.lessons || [];
  const sectionSeconds = sectionLessons.reduce(
    (total, lesson) => total + (lesson.durationSeconds || 0),
    0,
  );

  return (
    <div className="transition-colors">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`section-content-${section.id}`}
        id={`section-header-${section.id}`}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50/70"
      >
        <div className="flex min-w-0 items-center gap-3 pr-4">
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-slate-600 transition-transform duration-200",
              isOpen ? "rotate-180" : "rotate-0",
            )}
          />
          <span className="truncate text-base font-bold text-heading">{section.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm font-medium text-slate-500">
          <span>{sectionLessons.length} Bài học</span>
          {sectionSeconds > 0 ? <span>{formatDuration(sectionSeconds)}</span> : null}
        </div>
      </button>

      <div
        id={`section-content-${section.id}`}
        role="region"
        aria-labelledby={`section-header-${section.id}`}
        className={cn(
          "grid transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none",
        )}
      >
        <div className="overflow-hidden">
          <div className="bg-white px-5 pb-3 pt-2">
            {section.introduction ? (
              <div className="relative pl-4">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                />
                <p className="text-xs font-semibold leading-5 text-primary">Giới thiệu</p>
                <p className="mt-1 text-[15px] font-semibold leading-6 text-heading">
                  {section.introduction}
                </p>
              </div>
            ) : null}
            {section.description ? (
              <div
                className={cn(
                  "text-sm leading-6 text-slate-600 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_h1]:my-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-1.5 [&_ul]:list-disc",
                  section.introduction && "mt-3 border-t border-slate-100 pt-2",
                )}
                dangerouslySetInnerHTML={{
                  __html: sanitizeCourseDescription(section.description),
                }}
              />
            ) : null}
            {sectionLessons.length ? (
              <div
                className={cn(
                  "divide-y divide-slate-100",
                  (section.introduction || section.description) && "mt-3 border-t border-slate-100",
                )}
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
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                      {lesson.title}
                    </span>
                    {lesson.durationSeconds !== null && lesson.durationSeconds > 0 ? (
                      <span className="text-xs text-muted">
                        {`${Math.ceil(lesson.durationSeconds / 60)} phút`}
                      </span>
                    ) : null}
                    {lesson.preview ? (
                      <button
                        type="button"
                        className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white active:scale-95"
                        onClick={() => onPreviewLesson(lesson.id)}
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
