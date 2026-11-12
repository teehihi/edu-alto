"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, SlidersHorizontal, X } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  updateCalendarEvent,
  type CalendarEvent,
} from "@/lib/schedule-client";

export function CalendarView() {
  const { getAccessToken } = useAuthSession();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"month" | "week" | "day">("month");
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthDays = new Date(year, month + 1, 0).getDate();
  const weekStart = new Date(selected);
  weekStart.setDate(selected.getDate() - selected.getDay());
  const cells =
    calendarMode === "day"
      ? [selected.getDate()]
      : calendarMode === "week"
        ? Array.from({ length: 7 }, (_, index) => weekStart.getDate() + index)
        : Array.from({ length: 42 }, (_, index) => index - firstWeekday + 1);
  const title = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(
    monthDate,
  );
  const selectedLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(selected);
  useEffect(() => {
    let active = true;
    async function loadEvents() {
      setLoading(true);
      setError("");
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const result = await fetchCalendarEvents(
          token,
          new Date(year, month, 1),
          new Date(year, month + 1, 1),
        );
        if (active) setEvents(result.filter((event) => event.status !== "CANCELLED"));
      } catch (reason) {
        if (active)
          setError(
            reason instanceof ApiClientError ? reason.message : "Không thể tải lịch học lúc này.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadEvents();
    return () => {
      active = false;
    };
  }, [getAccessToken, month, year]);
  const selectedEvents = events.filter(
    (event) => new Date(event.startsAt).toDateString() === selected.toDateString(),
  );
  function openNewEvent() {
    const start = new Date(selected);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    setEditingEventId(null);
    setEventTitle("");
    setEventDescription("");
    setEventStart(toLocalDateTimeInput(start));
    setEventEnd(toLocalDateTimeInput(end));
    setError("");
    setEventFormOpen(true);
  }
  function openEditEvent(event: CalendarEvent) {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventDescription(event.description ?? "");
    setEventStart(toLocalDateTimeInput(new Date(event.startsAt)));
    setEventEnd(toLocalDateTimeInput(new Date(event.endsAt)));
    setError("");
    setEventFormOpen(true);
  }
  async function saveEvent(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!eventStart || !eventEnd || new Date(eventEnd) <= new Date(eventStart)) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }
    setSavingEvent(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const payload = {
        title: eventTitle.trim(),
        description: eventDescription.trim() || null,
        startsAt: new Date(eventStart).toISOString(),
        endsAt: new Date(eventEnd).toISOString(),
      };
      const saved = editingEventId
        ? await updateCalendarEvent(token, editingEventId, payload)
        : await createCalendarEvent(token, payload);
      setEvents((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelected(new Date(saved.startsAt));
      setMonthDate(new Date(saved.startsAt));
      setEventFormOpen(false);
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể lưu sự kiện lúc này.",
      );
    } finally {
      setSavingEvent(false);
    }
  }
  async function removeEvent(eventId: string) {
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await deleteCalendarEvent(token, eventId);
      setEvents((current) => current.filter((event) => event.id !== eventId));
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể xóa sự kiện lúc này.",
      );
    }
  }
  function shiftMonth(delta: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }
  return (
    <div className="grid items-start gap-4">
      <section className="rounded-xl border border-[#e5ede9] bg-white p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e9ec] pb-3">
          <h1 className="text-base font-semibold text-primary">Thời khóa biểu</h1>
          <div className="flex items-center gap-1 text-xs">
            {(["Tháng", "Tuần", "Ngày"] as const).map((label) => {
              const mode = label === "Tháng" ? "month" : label === "Tuần" ? "week" : "day";
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCalendarMode(mode)}
                  aria-pressed={calendarMode === mode}
                  className={cn(
                    "focus-ring h-9 border-b-2 px-3",
                    calendarMode === mode
                      ? "border-primary font-medium text-primary"
                      : "border-transparent text-[#667085]",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-primary px-3 text-xs text-primary"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Lọc
            </button>
            <button
              type="button"
              onClick={openNewEvent}
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-[#079367] px-3 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm sự kiện
            </button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="mr-1 text-sm font-medium capitalize text-[#079367]">{title}</h2>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md bg-[#f2f5f3] hover:bg-[#e8f8f2]"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setMonthDate(today);
              setSelected(today);
            }}
            className="focus-ring h-8 rounded-md bg-[#079367] px-3 text-xs font-medium text-white"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md bg-[#f2f5f3] hover:bg-[#e8f8f2]"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="ml-auto" />
          <div className="hidden">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-[#e6ece9] hover:bg-[#effaf5]"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setMonthDate(today);
                setSelected(today);
              }}
              className="focus-ring rounded-lg border border-[#e6ece9] px-3 text-xs font-medium hover:bg-[#effaf5]"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="focus-ring grid h-9 w-9 place-items-center rounded-lg border border-[#e6ece9] hover:bg-[#effaf5]"
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-t-md border border-b-0 border-[#e5e7eb] text-center text-[10px] font-semibold text-[#079367]">
          {["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"].map((day) => (
            <span key={day} className="bg-[#fafafa] py-2">
              {day}
            </span>
          ))}
        </div>
        <div
          className={cn(
            "overflow-hidden rounded-b-md border-l border-t border-[#e5e7eb]",
            calendarMode === "day" ? "grid grid-cols-1" : "grid grid-cols-7",
          )}
        >
          {cells.map((day, index) => {
            const date =
              calendarMode === "day"
                ? new Date(selected)
                : calendarMode === "week"
                  ? new Date(
                      weekStart.getFullYear(),
                      weekStart.getMonth(),
                      weekStart.getDate() + index,
                    )
                  : new Date(year, month, day);
            const inMonth = calendarMode !== "month" || (day > 0 && day <= monthDays);
            const isSelected = inMonth && selected.toDateString() === date.toDateString();
            const isToday = inMonth && new Date().toDateString() === date.toDateString();
            return (
              <button
                key={index}
                disabled={!inMonth}
                onClick={() => setSelected(date)}
                className={cn(
                  "focus-ring flex min-h-[92px] flex-col items-stretch border-b border-r border-[#e5e7eb] p-2 text-left text-xs transition md:min-h-[112px]",
                  !inMonth && "text-[#b0b5b8]",
                  isSelected && "bg-[#f0fbf7]",
                  !isSelected && isToday && "bg-[#fbfefc]",
                  !isSelected && !isToday && "hover:bg-[#fbfefc]",
                )}
              >
                <span
                  className={cn(
                    "mb-1 grid h-5 w-5 place-items-center rounded-full",
                    isToday && "bg-primary font-semibold text-white",
                  )}
                >
                  {date.getDate()}
                </span>
                <span className="space-y-1">
                  {events
                    .filter(
                      (event) => new Date(event.startsAt).toDateString() === date.toDateString(),
                    )
                    .slice(0, 2)
                    .map((event, eventIndex) => (
                      <span
                        key={event.id}
                        className={cn(
                          "block truncate rounded-sm px-1 py-0.5 text-[9px] leading-3",
                          [
                            "bg-rose-50 text-rose-600",
                            "bg-amber-50 text-amber-700",
                            "bg-emerald-50 text-emerald-700",
                            "bg-purple-50 text-purple-700",
                          ][eventIndex % 4],
                        )}
                      >
                        {event.title}
                      </span>
                    ))}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={openNewEvent}
          className="focus-ring mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]"
        >
          <Plus className="h-4 w-4" /> Thêm sự kiện
        </button>
      </section>
      <aside className="rounded-xl border border-[#e5ede9] bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8faf4] text-primary">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Lịch trong ngày</h2>
            <p className="mt-1 text-xs capitalize text-[#87928d]">{selectedLabel}</p>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-600">
            {error}
          </p>
        )}
        {loading ? (
          <p className="mt-5 text-sm text-[#87928d]">Đang tải lịch…</p>
        ) : selectedEvents.length ? (
          <ul className="mt-5 space-y-3">
            {selectedEvents.map((event) => (
              <li key={event.id} className="rounded-lg border border-[#e8eeeb] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#34413c]">{event.title}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditEvent(event)}
                      className="focus-ring text-xs text-primary"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeEvent(event.id)}
                      className="focus-ring text-xs text-rose-600"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-[#77837e]">
                  {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(
                    new Date(event.startsAt),
                  )}
                </p>
                {event.description && (
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#77837e]">
                    {event.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-lg bg-[#f8fbf9] px-4 py-8 text-center">
            <p className="text-sm font-medium text-[#47534e]">Chưa có sự kiện</p>
            <p className="mt-1 text-xs leading-5 text-[#87928d]">
              Các sự kiện lịch cá nhân sẽ xuất hiện tại đây.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={openNewEvent}
          className="focus-ring mt-4 w-full rounded-lg border border-[#dfe8e3] px-3 py-2 text-xs font-semibold text-primary hover:bg-[#effaf5]"
        >
          Thêm sự kiện trong ngày
        </button>
        <Link
          href="/learning/courses"
          className="focus-ring mt-4 inline-flex text-xs font-semibold text-primary hover:underline"
        >
          Xem khóa học của tôi
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </aside>
      {eventFormOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#101a2c]/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEventFormOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-title"
            onSubmit={saveEvent}
            className="w-full max-w-lg space-y-4 rounded-xl bg-white p-5 shadow-xl md:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 id="calendar-event-title" className="text-lg font-semibold text-[#101a2c]">
                {editingEventId ? "Sửa sự kiện" : "Thêm sự kiện"}
              </h2>
              <button
                type="button"
                onClick={() => setEventFormOpen(false)}
                aria-label="Đóng"
                className="focus-ring rounded-lg p-2 hover:bg-[#f3f7f5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-sm font-medium">
              Tiêu đề
              <input
                required
                maxLength={200}
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e3] px-3"
              />
            </label>
            <label className="block text-sm font-medium">
              Mô tả
              <textarea
                maxLength={10000}
                rows={3}
                value={eventDescription}
                onChange={(event) => setEventDescription(event.target.value)}
                className="focus-ring mt-1.5 w-full rounded-lg border border-[#dfe8e3] p-3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Bắt đầu
                <input
                  required
                  type="datetime-local"
                  value={eventStart}
                  onChange={(event) => setEventStart(event.target.value)}
                  className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e3] px-2"
                />
              </label>
              <label className="block text-sm font-medium">
                Kết thúc
                <input
                  required
                  type="datetime-local"
                  value={eventEnd}
                  onChange={(event) => setEventEnd(event.target.value)}
                  className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-[#dfe8e3] px-2"
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="text-sm text-rose-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEventFormOpen(false)}
                className="focus-ring rounded-lg border border-[#dfe8e3] px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingEvent}
                className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingEvent ? "Đang lưu…" : "Lưu sự kiện"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function toLocalDateTimeInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
