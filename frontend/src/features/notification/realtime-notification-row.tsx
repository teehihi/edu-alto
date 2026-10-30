"use client";

import Link from "next/link";
import { Bell, Megaphone, MessageCircle, MessageSquareText, UserPlus } from "lucide-react";
import type { RealtimeNotification } from "@/lib/realtime-notification-client";

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return "";

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (elapsedSeconds < 60) return "Vừa xong";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} phút trước`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} giờ trước`;
  if (elapsedSeconds < 604800) return `${Math.floor(elapsedSeconds / 86400)} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(createdAt));
}

function resolveNotificationIcon(type: string) {
  switch (type) {
    case "DISCUSSION_REPLY":
      return {
        Icon: MessageSquareText,
        bgClass: "bg-emerald-100 text-primary",
      };
    case "NEW_ENROLLMENT":
      return {
        Icon: UserPlus,
        bgClass: "bg-blue-100 text-blue-600",
      };
    case "REVIEW_REPLY":
      return {
        Icon: MessageCircle,
        bgClass: "bg-amber-100 text-amber-600",
      };
    case "ANNOUNCEMENT":
      return {
        Icon: Megaphone,
        bgClass: "bg-purple-100 text-purple-600",
      };
    default:
      return {
        Icon: Bell,
        bgClass: "bg-slate-100 text-slate-600",
      };
  }
}

export function RealtimeNotificationRow({
  item,
  onRead,
}: {
  item: RealtimeNotification;
  onRead: () => void;
}) {
  const isRead = Boolean(item.readAt);
  const { Icon, bgClass } = resolveNotificationIcon(item.type);

  const content = (
    <>
      <span
        className={`relative mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bgClass}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block text-sm font-semibold text-heading leading-snug">{item.title}</span>
        <span className="mt-0.5 block text-xs leading-4 text-slate-600 line-clamp-2">
          {item.message}
        </span>
        <time dateTime={item.createdAt} className="mt-1 block text-[11px] text-muted">
          {formatRelativeTime(item.createdAt)}
        </time>
      </span>
      {!isRead ? (
        <span
          className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
          aria-label="Chưa xem"
        />
      ) : null}
    </>
  );

  const className = `focus-ring flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
    isRead ? "bg-white" : "bg-[#F5FBF9]"
  }`;

  if (item.linkUrl && /^https?:\/\//i.test(item.linkUrl)) {
    return (
      <a
        href={item.linkUrl}
        target="_blank"
        rel="noreferrer"
        onClick={onRead}
        className={className}
      >
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
