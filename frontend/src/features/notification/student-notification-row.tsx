"use client";

import Link from "next/link";
import { Megaphone, MessageCircle } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { StudentNotification } from "@/lib/student-notification-client";

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return "";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (elapsedSeconds < 60) return "Vừa xong";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} phút trước`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} giờ trước`;
  if (elapsedSeconds < 604800) return `${Math.floor(elapsedSeconds / 86400)} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(createdAt),
  );
}

function getCourseTitle(title: string) {
  return title.startsWith("Phản hồi đánh giá: ") ? title.slice("Phản hồi đánh giá: ".length) : title;
}

export function StudentNotificationRow({
  item,
  isRead,
  onRead,
}: {
  item: StudentNotification;
  isRead: boolean;
  onRead: () => void;
}) {
  const isReply = item.type === "REVIEW_REPLY";
  const TypeIcon = isReply ? MessageCircle : Megaphone;
  const courseOrAnnouncement = getCourseTitle(item.title);

  const content = (
    <>
      <span className="relative mt-0.5 inline-flex h-12 w-12 shrink-0 self-start">
        <UserAvatar
          name={item.instructorName}
          avatarUrl={item.instructorAvatarUrl}
          size="lg"
          imageClassName="border-0 shadow-none"
        />
        <span className="absolute bottom-0 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-primary text-white">
          <TypeIcon className="h-3 w-3" aria-hidden="true" />
        </span>
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block text-sm leading-5 text-heading">
          <strong className="font-semibold">{item.instructorName}</strong>{" "}
          {isReply ? "đã phản hồi đánh giá của bạn về" : "đã đăng thông báo"} {courseOrAnnouncement}
        </span>
        <time dateTime={item.createdAt} className="mt-1 block text-xs text-muted">
          {formatRelativeTime(item.createdAt)}
        </time>
      </span>
      {!isRead ? (
        <span className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1877F2]" aria-label="Chưa xem" />
      ) : null}
    </>
  );

  const className = `focus-ring flex w-full gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-100 ${
    isRead ? "bg-white" : "bg-[#F0F7FF]"
  }`;

  if (item.linkUrl && /^https?:\/\//i.test(item.linkUrl)) {
    return (
      <a href={item.linkUrl} target="_blank" rel="noreferrer" onClick={onRead} className={className}>
        {content}
      </a>
    );
  }

  if (item.linkUrl) {
    return (
      <Link href={item.linkUrl} onClick={onRead} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onRead} className={className}>
      {content}
    </button>
  );
}
