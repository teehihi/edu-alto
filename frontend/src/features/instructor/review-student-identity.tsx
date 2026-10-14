"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, MessageCircle, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getPublicProfile } from "@/features/auth/auth-client";
import type { PublicUserProfile } from "@/types/auth";

type ReviewStudentIdentityProps = {
  studentId: string;
  studentName: string;
  studentAvatarUrl?: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function ReviewStudentIdentity({
  studentId,
  studentName,
  studentAvatarUrl,
  createdAt,
}: ReviewStudentIdentityProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogTitleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const requestVersionRef = useRef(0);

  async function showProfile() {
    setOpen(true);
    setError("");
    if (profile || loading) return;

    const requestVersion = ++requestVersionRef.current;
    setLoading(true);
    try {
      const result = await getPublicProfile(studentId);
      if (requestVersion === requestVersionRef.current) setProfile(result);
    } catch {
      if (requestVersion === requestVersionRef.current) {
        setError("Chưa thể tải thông tin hồ sơ. Vui lòng thử lại.");
      }
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false);
    }
  }

  const closeProfile = useCallback(() => {
    requestVersionRef.current += 1;
    setLoading(false);
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeProfile();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeProfile, open]);

  const displayedName = profile?.fullName ?? studentName;
  const occupation = profile?.studentProfile?.occupation?.trim();
  const educationLevel = profile?.studentProfile?.educationLevel?.trim();
  const learningGoal = profile?.studentProfile?.learningGoal?.trim();
  const interests = profile?.studentProfile?.interests?.trim();

  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => void showProfile()}
          aria-label={`Xem hồ sơ của ${studentName}`}
          className="focus-ring inline-flex min-w-0 items-center gap-2.5 rounded-md text-left hover:text-primary"
        >
          <UserAvatar
            name={studentName}
            avatarUrl={studentAvatarUrl}
            size="sm"
            className="pointer-events-none"
          />
          <span className="truncate text-sm font-semibold text-slate-900">{studentName}</span>
        </button>
        <time dateTime={createdAt} className="shrink-0 text-xs text-slate-400">
          {formatDate(createdAt)}
        </time>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProfile();
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id={dialogTitleId} className="text-base font-semibold text-[#101a2c]">
                Hồ sơ học viên
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeProfile}
                aria-label="Đóng hồ sơ"
                className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="px-5 py-6">
              <div className="flex items-center gap-4">
                <UserAvatar
                  name={displayedName}
                  avatarUrl={profile?.avatarUrl ?? studentAvatarUrl}
                  size="xl"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-[#101a2c]">{displayedName}</h3>
                  <p className="mt-1 text-sm text-slate-500">Học viên EduAlto</p>
                  {profile?.headline ? (
                    <p className="mt-1 text-sm text-slate-600">{profile.headline}</p>
                  ) : null}
                </div>
              </div>

              {loading ? (
                <p role="status" className="mt-6 flex items-center gap-2 text-sm text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang tải hồ sơ…
                </p>
              ) : error ? (
                <p role="alert" className="mt-5 text-sm text-rose-700">
                  {error}
                </p>
              ) : (
                <>
                  {profile?.bio ? (
                    <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {profile.bio}
                    </p>
                  ) : null}
                  {occupation || educationLevel || learningGoal || interests ? (
                    <dl className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm">
                      {occupation ? (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">Công việc</dt>
                          <dd className="text-right font-medium text-slate-800">{occupation}</dd>
                        </div>
                      ) : null}
                      {educationLevel ? (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">Trình độ</dt>
                          <dd className="text-right font-medium text-slate-800">{educationLevel}</dd>
                        </div>
                      ) : null}
                      {learningGoal ? (
                        <div className="grid gap-1">
                          <dt className="text-slate-500">Mục tiêu học tập</dt>
                          <dd className="font-medium text-slate-800">{learningGoal}</dd>
                        </div>
                      ) : null}
                      {interests ? (
                        <div className="grid gap-1">
                          <dt className="text-slate-500">Sở thích học tập</dt>
                          <dd className="font-medium text-slate-800">{interests}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                  {!profile?.bio && !occupation && !educationLevel && !learningGoal && !interests ? (
                    <p className="mt-5 text-sm text-slate-500">
                      Học viên chưa bổ sung thông tin giới thiệu.
                    </p>
                  ) : null}
                </>
              )}

              <div className="mt-6 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled
                  title="Tính năng nhắn tin sẽ sớm có mặt."
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white opacity-60"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Nhắn tin · Sắp có
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
