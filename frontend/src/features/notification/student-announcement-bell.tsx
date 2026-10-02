"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ExternalLink, Megaphone } from "lucide-react";
import { useAuthSession } from "@/lib/auth-session";
import { ApiClientError } from "@/lib/api";
import {
  fetchStudentInstructorAnnouncements,
  type StudentInstructorAnnouncement,
} from "@/lib/instructor-notification-client";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function StudentAnnouncementBell() {
  const { user, isAuthenticated, getAccessToken } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StudentInstructorAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded || !isAuthenticated) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void getAccessToken()
        .then((token) => {
          if (!active) return null;
          if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          return fetchStudentInstructorAnnouncements(token);
        })
        .then((page) => {
          if (active && page) {
            setItems(page.data);
            setLoaded(true);
          }
        })
        .catch((loadError) => {
          if (active) {
            setError(
              loadError instanceof ApiClientError
                ? loadError.message
                : loadError instanceof Error
                  ? loadError.message
                  : "Không thể tải thông báo.",
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [getAccessToken, isAuthenticated, loaded, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!isAuthenticated || !user?.roles?.includes("STUDENT")) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Thông báo"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="focus-ring relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:text-primary"
      >
        <Bell className="h-[21px] w-[21px] stroke-[1.8]" aria-hidden="true" />
      </button>
      {open ? (
        <section
          role="dialog"
          aria-label="Thông báo từ giảng viên"
          className="absolute right-0 top-full z-[80] mt-3 max-h-[min(70vh,560px)] w-[min(92vw,420px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <header className="border-b border-slate-100 px-4 py-3.5">
            <h2 className="font-semibold text-heading">Thông báo từ giảng viên</h2>
            <p className="mt-0.5 text-xs text-muted">Cập nhật mới từ các khóa học của bạn</p>
          </header>
          <div className="max-h-[min(60vh,470px)] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4" aria-label="Đang tải thông báo" aria-busy="true">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : null}
            {error && !loading ? (
              <div className="p-4 text-sm text-rose-700" role="alert">
                {error}
                <button
                  type="button"
                  onClick={() => {
                    setLoaded(false);
                    setError("");
                  }}
                  className="ml-2 font-semibold underline"
                >
                  Thử lại
                </button>
              </div>
            ) : null}
            {!loading && !error && items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Megaphone className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-heading">Chưa có thông báo mới</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Thông tin từ giảng viên sẽ hiển thị tại đây.
                </p>
              </div>
            ) : null}
            {!loading && items.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id} className="p-4">
                    <article className="flex gap-3">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-14 w-16 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-primary">
                          <Megaphone size={19} aria-hidden="true" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold leading-5 text-heading">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-primary">{item.instructorName}</p>
                        <time
                          dateTime={item.publishedAt}
                          className="mt-1 block text-[11px] text-muted"
                        >
                          {formatDate(item.publishedAt)}
                        </time>
                      </div>
                    </article>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                    {item.linkUrl ? (
                      <a
                        href={item.linkUrl}
                        target={item.linkUrl.startsWith("http") ? "_blank" : undefined}
                        rel={item.linkUrl.startsWith("http") ? "noreferrer" : undefined}
                        className="focus-ring mt-2 inline-flex min-h-8 items-center gap-1.5 rounded text-xs font-semibold text-primary hover:underline"
                      >
                        Xem chi tiết <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
