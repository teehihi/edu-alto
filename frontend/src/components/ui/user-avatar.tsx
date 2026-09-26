"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showBadge?: boolean;
};

const DEFAULT_AVATAR = "/images/default-avatar.webp";

const sizeClasses = {
  xs: "h-7 w-7 text-[11px]",
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base font-semibold",
  xl: "h-16 w-16 text-xl font-bold",
  "2xl": "h-28 w-28 text-3xl font-bold sm:h-32 sm:w-32",
};

export function resolveAvatarUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // Local assets, blob URLs, and data URIs
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/images/")
  ) {
    return trimmed;
  }

  // If it's a Cloudflare R2 S3 endpoint URL (which returns 403 on direct browser GET), route through backend media endpoint
  if (trimmed.includes(".r2.cloudflarestorage.com/")) {
    const match = trimmed.match(/\.r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/);
    if (match && match[1]) {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
      const origin = apiBase.replace(/\/api\/v1\/?$/, "");
      return `${origin}/api/v1/media/${match[1]}`;
    }
  }

  if (trimmed.startsWith("/api/v1")) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
    const origin = apiBase.replace(/\/api\/v1\/?$/, "");
    return `${origin}${trimmed}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return trimmed;
}

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "E";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "E";
  if (parts.length === 1) {
    const word = parts[0];
    return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word.toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  showBadge = false,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const initials = getInitials(name);
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const targetSrc = resolvedUrl || DEFAULT_AVATAR;

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      {!imgError && targetSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={targetSrc}
          src={targetSrc}
          alt={name || "Ảnh đại diện"}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className={cn(
            "rounded-full object-cover border-2 border-primary shadow-xs",
            sizeClasses[size],
          )}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-primary bg-[#EAF7F3] font-bold text-primary tracking-wide select-none shadow-xs transition-all duration-200",
            sizeClasses[size],
          )}
          aria-label={name || "Ảnh đại diện"}
        >
          <span>{initials}</span>
        </div>
      )}

      {showBadge ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full bg-emerald-500 ring-2 ring-white",
            size === "xs" || size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
          )}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
