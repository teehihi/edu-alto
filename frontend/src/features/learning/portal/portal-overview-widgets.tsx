"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Clock } from "lucide-react";
import { SectionHeading } from "@/features/learning/portal/portal-shared";
import type { Assignment } from "@/lib/assignment-client";
import { cn } from "@/lib/cn";
import type { CalendarEvent } from "@/lib/schedule-client";
import type { StudentFocusItem } from "@/lib/student-analytics-client";

export type WeeklyActivityPoint = {
  day: string;
  full: string;
  hours: number;
  lessons: number;
  isToday: boolean;
};

export function OverviewActivityChart({
  activityMetric,
  onActivityMetricChange,
  weeklyActivity,
  maxWeeklyVal,
  totalWeeklyHours,
  currentWeekActiveDays,
}: {
  activityMetric: "hours" | "lessons";
  onActivityMetricChange: (metric: "hours" | "lessons") => void;
  weeklyActivity: WeeklyActivityPoint[];
  maxWeeklyVal: number;
  totalWeeklyHours: string;
  currentWeekActiveDays: number;
}) {
  return (
    <section className="portal-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-heading">
            Hoạt động học tập tuần này
          </h2>
          <p className="mt-0.5 text-xs text-muted">Thời lượng và tiến độ học tập hàng ngày</p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onActivityMetricChange("hours")}
            className={cn(
              "rounded-lg px-2.5 py-1 transition",
              activityMetric === "hours"
                ? "bg-white font-semibold text-heading shadow-xs"
                : "text-muted hover:text-heading",
            )}
          >
            Thời gian học
          </button>
          <button
            type="button"
            onClick={() => onActivityMetricChange("lessons")}
            className={cn(
              "rounded-lg px-2.5 py-1 transition",
              activityMetric === "lessons"
                ? "bg-white font-semibold text-heading shadow-xs"
                : "text-muted hover:text-heading",
            )}
          >
            Bài học
          </button>
        </div>
      </div>

      {/* 7-Day Activity Bars */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-[140px] px-2 pb-2 border-b border-dashed border-slate-200">
          {weeklyActivity.map((item) => {
            const val = activityMetric === "hours" ? item.hours : item.lessons;
            const heightPercent = Math.min(
              100,
              Math.max(8, Math.round((val / maxWeeklyVal) * 100)),
            );

            return (
              <div
                key={item.day}
                className="group relative flex flex-col items-center h-full justify-end"
              >
                {/* Tooltip on Hover */}
                <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-heading px-2 py-1 text-[10px] font-medium text-white shadow-xs group-hover:block transition">
                  {item.full}: {item.hours.toFixed(1)}h ({item.lessons} bài)
                </div>

                {/* Bar */}
                <div className="w-full max-w-[36px] h-full flex items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-300",
                      val > 0
                        ? item.isToday
                          ? "bg-primary shadow-xs shadow-primary/30"
                          : "bg-emerald-500/75 hover:bg-primary"
                        : "bg-slate-200/80",
                    )}
                    style={{ height: `${val > 0 ? heightPercent : 8}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Day Labels */}
        <div className="mt-3 grid grid-cols-7 gap-2 sm:gap-4 text-center">
          {weeklyActivity.map((item) => (
            <div key={item.day} className="flex flex-col items-center">
              <span
                className={cn(
                  "text-[11px] font-medium transition",
                  item.isToday
                    ? "rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800"
                    : "text-muted",
                )}
              >
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Summary Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted pt-2 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <span>
            Tổng tuần này:{" "}
            <strong className="text-heading font-semibold tabular-nums">
              {totalWeeklyHours} giờ
            </strong>
          </span>
          <span>
            Ngày tích cực:{" "}
            <strong className="text-primary font-semibold tabular-nums">
              {currentWeekActiveDays}/7 ngày
            </strong>
          </span>
        </div>
        <Link
          href="/learning/analytics"
          className="focus-ring inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          <span>Xem phân tích chi tiết</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

export function OverviewRightRail({
  monthName,
  currentMonth,
  currentDay,
  selectedDate,
  onSelectDate,
  firstWeekday,
  days,
  eventsByDay,
  selectedDateEvents,
  pendingTasksCount,
  focusItems,
  remainingPendingAssignments,
  completion,
  totalCompleted,
  totalLessons,
  overallAvgScore,
}: {
  monthName: string;
  currentMonth: number;
  currentDay: number;
  selectedDate: number;
  onSelectDate: (day: number) => void;
  firstWeekday: number;
  days: number[];
  eventsByDay: Record<number, CalendarEvent[]>;
  selectedDateEvents: CalendarEvent[];
  pendingTasksCount: number;
  focusItems: StudentFocusItem[];
  remainingPendingAssignments: Assignment[];
  completion: number;
  totalCompleted: number;
  totalLessons: number;
  overallAvgScore: number | null;
}) {
  const gaugeRadius = 42;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const strokeDashoffset = gaugeCircumference - (gaugeCircumference * completion) / 100;

  return (
    <div className="space-y-6 lg:col-span-4">
      {/* A. Calendar & Upcoming Agenda Widget */}
      <section className="portal-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold capitalize tracking-tight text-heading">
              {monthName}
            </h2>
            <p className="text-[11px] text-muted">Lịch học và sự kiện</p>
          </div>
          <Link
            href="/learning/calendar"
            className="focus-ring inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary-dark transition"
          >
            <span>Mở lịch</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Weekday Headers */}
        <div className="mt-4 grid grid-cols-7 text-center text-[10px] font-semibold text-muted">
          {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => (
            <span key={day} className="py-1">
              {day}
            </span>
          ))}
        </div>

        {/* Full Days Grid (All days in month!) */}
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const isToday = day === currentDay;
            const isSelected = day === selectedDate;
            const hasEvents = Boolean(eventsByDay[day]?.length);

            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  "focus-ring relative mx-auto flex h-7 w-7 items-center justify-center rounded-xl text-xs font-medium transition active:scale-[0.95]",
                  isSelected
                    ? "bg-primary font-bold text-white shadow-xs shadow-primary/30"
                    : isToday
                      ? "border border-primary font-bold text-primary bg-emerald-50/50"
                      : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <span>{day}</span>
                {hasEvents && !isSelected && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Agenda List Right Below Calendar */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-heading">
              Sự kiện ngày {selectedDate} tháng {currentMonth + 1}
            </h3>
            <span className="text-[10px] text-muted">{selectedDateEvents.length} sự kiện</span>
          </div>

          {selectedDateEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDateEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs transition hover:bg-white hover:border-emerald-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-heading line-clamp-1">{ev.title}</span>
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 shrink-0">
                      Đã lên lịch
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Intl.DateTimeFormat("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(ev.startsAt))}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50/60 p-3.5 text-center text-xs">
              <CalendarDays className="mx-auto h-4 w-4 text-slate-400" />
              <p className="mt-1.5 text-[11px] text-muted">Không có lịch học nào vào ngày này.</p>
              <Link
                href="/learning/calendar"
                className="focus-ring mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <span>+ Thêm vào thời khóa biểu</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* B. Real Actionable To-Do Tasks & Assignments */}
      <section className="portal-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-heading">Việc cần làm</h2>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
              {pendingTasksCount}
            </span>
          </div>
          <Link
            href="/learning/assignments"
            className="focus-ring inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary-dark transition"
          >
            <span>Xem bài tập</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {pendingTasksCount === 0 ? (
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
            <p className="text-xs font-medium text-heading">
              Không có việc tồn đọng nào cần xử lý gấp.
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Mọi quiz chưa đạt hoặc bài tập sắp đến hạn sẽ tự động xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {focusItems.slice(0, 3).map((item) => (
              <div key={item.id} className="py-2.5 px-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-heading line-clamp-1">{item.title}</p>
                  <p className="text-[10px] text-muted mt-0.5 line-clamp-1">
                    {item.courseTitle} ·{" "}
                    <span
                      className={cn(
                        "font-medium",
                        item.priority === "HIGH" ? "text-rose-600" : "text-amber-600",
                      )}
                    >
                      {item.description}
                    </span>
                  </p>
                </div>
                <Link
                  href={item.actionHref}
                  className="focus-ring rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-emerald-100 shrink-0 transition"
                >
                  {item.actionLabel}
                </Link>
              </div>
            ))}

            {remainingPendingAssignments.slice(0, 2).map((assign) => (
              <div key={assign.id} className="py-2.5 px-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-heading line-clamp-1">{assign.title}</p>
                  <p className="text-[10px] text-coral font-medium mt-0.5">
                    {assign.dueAt
                      ? `Hạn nộp: ${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(assign.dueAt))}`
                      : "Bài tập được giao"}
                  </p>
                </div>
                <Link
                  href="/learning/assignments"
                  className="focus-ring rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-emerald-100 shrink-0 transition"
                >
                  Làm bài
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* C. Performance & Radial Gauge */}
      <section className="portal-card">
        <SectionHeading title="Hiệu suất học tập" action="Chi tiết" href="/learning/analytics" />

        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/40 p-5 text-center">
          {/* Radial SVG Gauge */}
          <div className="relative flex items-center justify-center">
            <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 108 108">
              {/* Background Track */}
              <circle
                cx="54"
                cy="54"
                r={gaugeRadius}
                className="text-emerald-100/70"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress Arc */}
              <circle
                cx="54"
                cy="54"
                r={gaugeRadius}
                className="text-primary transition-all duration-700 ease-out"
                strokeWidth="8"
                strokeDasharray={gaugeCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            {/* Center Percentage Display */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tracking-tight text-heading tabular-nums">
                {completion}%
              </span>
              <span className="text-[10px] font-medium text-muted">Hoàn thành</span>
            </div>
          </div>

          <p className="mt-3 text-xs font-semibold text-heading">
            {totalCompleted} / {totalLessons || 0} bài học đã hoàn tất
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {overallAvgScore !== null
              ? `Điểm trung bình các bài đánh giá: ${overallAvgScore.toFixed(1)}/10`
              : completion > 0
                ? "Đang duy trì nhịp độ học tập đều đặn."
                : "Hãy bắt đầu bài học đầu tiên ngay hôm nay!"}
          </p>
        </div>
      </section>
    </div>
  );
}
