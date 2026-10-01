"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type DateTimePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
};

const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function toLocalDate(value: string): Date | null {
  if (!value) return null;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  if (![year, month, day, hours, minutes].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hours, minutes);
}

function formatLocalDateTime(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function formatDisplayValue(value: string): string {
  const date = toLocalDate(value);
  if (!date) return "Chọn ngày & giờ";
  return `${date.toLocaleDateString("vi-VN")} · ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function sameDay(first: Date | null, second: Date): boolean {
  return Boolean(
    first &&
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate(),
  );
}

function changeMonth(date: Date, offset: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() + offset,
    1,
    date.getHours(),
    date.getMinutes(),
  );
}

export function DateTimePicker({
  label,
  value,
  onChange,
  disabled = false,
  error,
  className = "",
}: DateTimePickerProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = toLocalDate(value) ?? new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [draft, setDraft] = useState<Date | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const monthLabel = visibleMonth.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });
  const firstWeekday = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const dialogId = `${id}-calendar`;

  function updatePopoverPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 16);
    const estimatedHeight = Math.min(420, window.innerHeight - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    const below = rect.bottom + estimatedHeight + 5 <= window.innerHeight - 8;
    const top = below
      ? rect.bottom + 5
      : rect.top - estimatedHeight - 5 >= 8
        ? rect.top - estimatedHeight - 5
        : Math.max(8, window.innerHeight - estimatedHeight - 8);
    setPopoverStyle({ left, top, width, maxHeight: estimatedHeight, visibility: "visible" });
  }

  useEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open]);

  function openPicker() {
    const initial = toLocalDate(value) ?? new Date();
    setDraft(initial);
    setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
    setOpen(true);
  }

  function changeTime(part: "hours" | "minutes", amount: number) {
    setDraft((current) => {
      const next = new Date(current ?? new Date());
      if (part === "hours") next.setHours(next.getHours() + amount);
      else next.setMinutes(next.getMinutes() + amount);
      return next;
    });
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <label
        htmlFor={`${id}-trigger`}
        className="block text-[13px] font-medium leading-5 text-heading"
      >
        {label}
      </label>
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        disabled={disabled}
        onClick={open ? () => setOpen(false) : openPicker}
        className={`mt-1.5 flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left text-[13px] outline-none transition focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 ${error ? "border-rose-400 focus-visible:border-rose-500" : "border-slate-200 hover:border-primary focus-visible:border-primary"}`}
      >
        <span className={value ? "text-heading" : "text-muted"}>{formatDisplayValue(value)}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      </button>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              id={dialogId}
              role="dialog"
              aria-label={`${label}: chọn ngày và giờ`}
              aria-modal="false"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  triggerRef.current?.focus();
                }
              }}
              style={popoverStyle}
              className="fixed z-[70] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Tháng trước"
                  onClick={() => setVisibleMonth((month) => changeMonth(month, -1))}
                  className="focus-ring rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-heading"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <p className="font-bold text-primary">{monthLabel}</p>
                <button
                  type="button"
                  aria-label="Tháng sau"
                  onClick={() => setVisibleMonth((month) => changeMonth(month, 1))}
                  className="focus-ring rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-heading"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-7 text-center">
                {weekdays.map((weekday, index) => (
                  <span
                    key={weekday}
                    className={`py-2 text-[11px] font-semibold ${index === 0 ? "text-rose-500" : "text-slate-500"}`}
                  >
                    {weekday}
                  </span>
                ))}
                {Array.from({ length: firstWeekday }, (_, index) => (
                  <span key={`blank-${index}`} aria-hidden="true" />
                ))}
                {days.map((day) => {
                  const columnIndex = (firstWeekday + day - 1) % 7;
                  const date = new Date(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth(),
                    day,
                    draft?.getHours() ?? 0,
                    draft?.getMinutes() ?? 0,
                  );
                  const selected = sameDay(draft, date);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected}
                      aria-label={date.toLocaleDateString("vi-VN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      onClick={() => setDraft(date)}
                      className={`mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selected ? "border border-primary/40 text-primary" : columnIndex === 0 ? "text-rose-500 hover:bg-rose-50" : "text-heading hover:bg-slate-100"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-semibold text-primary">Giờ</p>
                <div className="flex items-center gap-2">
                  <TimeStepper
                    label="Giờ"
                    value={String(draft?.getHours() ?? 0).padStart(2, "0")}
                    onPrevious={() => changeTime("hours", -1)}
                    onNext={() => changeTime("hours", 1)}
                  />
                  <span className="text-slate-500" aria-hidden="true">
                    :
                  </span>
                  <TimeStepper
                    label="Phút"
                    value={String(draft?.getMinutes() ?? 0).padStart(2, "0")}
                    onPrevious={() => changeTime("minutes", -5)}
                    onNext={() => changeTime("minutes", 5)}
                  />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="focus-ring min-h-9 rounded-xl border border-rose-400 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-50 active:bg-rose-100"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (draft) onChange(formatLocalDateTime(draft));
                    setOpen(false);
                  }}
                  className="focus-ring min-h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
                >
                  Xong
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function TimeStepper({
  label,
  value,
  onPrevious,
  onNext,
}: {
  label: string;
  value: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex min-h-11 flex-1 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-2">
      <button
        type="button"
        aria-label={`${label} lùi`}
        onClick={onPrevious}
        className="focus-ring rounded p-1 text-slate-500 hover:text-heading"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold text-heading">{value}</span>
      <button
        type="button"
        aria-label={`${label} tới`}
        onClick={onNext}
        className="focus-ring rounded p-1 text-slate-500 hover:text-heading"
      >
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}
