"use client";

import { Check, Copy, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface CertificateShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  studentName?: string;
  courseTitle?: string;
  certificateNumber?: string;
}

export function CertificateShareModal({
  open,
  onClose,
  title,
  url,
  studentName,
  courseTitle,
  certificateNumber,
}: CertificateShareModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const shareText = `Chứng chỉ hoàn thành khóa học "${courseTitle || title}" của ${studentName || "tôi"} trên nền tảng EduAlto. Mã xác thực: ${certificateNumber || ""}`;

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
  const zaloUrl = `https://chat.zalo.me/`;

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          void handleCopy();
        }
      }
    } else {
      void handleCopy();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 transition-all sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-primary">
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-base font-bold text-heading">
                Chia sẻ chứng chỉ
              </h2>
              <p className="text-xs text-slate-500">Lan tỏa thành tích học tập qua liên kết</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Copy Link Input Section */}
        <div className="mt-5">
          <label
            htmlFor="share-link-input"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Đường dẫn xác thực trực tuyến
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="share-link-input"
                type="text"
                readOnly
                value={url}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600 outline-hidden select-all"
                onFocus={(e) => e.target.select()}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="focus-ring inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#159e75] transition active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Đã chép
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Sao chép
                </>
              )}
            </button>
          </div>
          {copied && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700 animate-in fade-in">
              <Check className="h-3 w-3" aria-hidden="true" /> Đã sao chép liên kết vào bộ nhớ tạm!
            </p>
          )}
        </div>

        {/* Quick Social Share Buttons */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-700 mb-3">Chia sẻ nhanh qua mạng xã hội</p>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-center transition hover:border-[#1877F2]/40 hover:bg-[#1877F2]/5 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-2xs group-hover:scale-105 transition">
                <span className="font-bold text-sm">f</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-700 group-hover:text-[#1877F2]">
                Facebook
              </span>
            </a>

            {/* Zalo */}
            <a
              href={zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void handleCopy()}
              className="focus-ring flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-center transition hover:border-[#0068FF]/40 hover:bg-[#0068FF]/5 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0068FF] text-white shadow-2xs group-hover:scale-105 transition">
                <span className="font-bold text-[10px] tracking-tight">Zalo</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-700 group-hover:text-[#0068FF]">
                Zalo
              </span>
            </a>

            {/* X / Twitter */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-center transition hover:border-slate-400 hover:bg-slate-100 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xs group-hover:scale-105 transition">
                <span className="font-bold text-xs">𝕏</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-700 group-hover:text-slate-900">
                X / Twitter
              </span>
            </a>
          </div>
        </div>

        {/* Mobile Device Native Share */}
        {typeof navigator !== "undefined" && "share" in navigator && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-heading shadow-2xs hover:bg-slate-50 transition"
            >
              <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Mở tùy chọn chia sẻ trên thiết bị
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
