"use client";

import { forwardRef } from "react";

export interface CertificateSheetProps {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  certificateNumber: string;
  issuedAt: string;
  qrCodeDataUrl?: string;
  verificationUrl?: string;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return value;
  }
}

function computeShortHash(certNum: string, student: string, course: string, date: string): string {
  const str = `${certNum}|${student}|${course}|${date}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
  return `SEC-${hex}-EA`;
}

export const CertificateSheet = forwardRef<HTMLDivElement, CertificateSheetProps>(
  function CertificateSheet(
    {
      studentName,
      courseTitle,
      instructorName,
      certificateNumber,
      issuedAt,
      qrCodeDataUrl,
      verificationUrl,
    },
    ref,
  ) {
    const formattedDate = formatDate(issuedAt);
    const secHash = computeShortHash(certificateNumber, studentName, courseTitle, formattedDate);

    return (
      <article
        ref={ref}
        className="certificate-print-sheet relative mx-auto w-full max-w-5xl rounded-2xl border-[6px] sm:border-[8px] md:border-[10px] border-double border-[#20b486] bg-[#fbfdfc] p-6 sm:p-10 md:p-12 text-center shadow-lg transition-shadow overflow-hidden md:aspect-[1.414/1] md:flex md:flex-col md:justify-between"
      >
        {/* Subtle Watermark in background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035] select-none"
        >
          <div className="h-72 w-72 rounded-full border-[24px] border-[#20b486]" />
        </div>

        {/* Top Header & Logo */}
        <div className="relative z-10 flex flex-col items-center">
          <img
            src="/images/logo-with-text.png"
            alt="EduAlto Logo"
            className="h-11 sm:h-13 md:h-15 w-auto object-contain print:h-16"
          />
          <div className="mt-2.5 flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="h-px w-6 sm:w-10 bg-slate-300" />
            <span>Nền tảng học tập trực tuyến • Chứng chỉ điện tử</span>
            <span className="h-px w-6 sm:w-10 bg-slate-300" />
          </div>

          <h1 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-heading">
            Chứng nhận hoàn thành
          </h1>
          <p className="mt-1 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-primary">
            Certificate of Completion
          </p>
        </div>

        {/* Certificate Recipient & Course Body */}
        <div className="relative z-10 my-4 sm:my-6 md:my-4 flex flex-col items-center">
          <p className="text-xs sm:text-sm text-slate-500">Chứng nhận rằng học viên</p>

          <p className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black text-primary tracking-tight">
            {studentName}
          </p>

          <div className="my-2.5 flex items-center justify-center gap-2">
            <div className="h-0.5 w-16 sm:w-28 bg-gradient-to-r from-transparent to-[#20b486]" />
            <div className="h-2 w-2 rotate-45 bg-[#D4AF37]" />
            <div className="h-0.5 w-16 sm:w-28 bg-gradient-to-l from-transparent to-[#20b486]" />
          </div>

          <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-600">
            đã hoàn thành xuất sắc toàn bộ nội dung xuất bản của khóa học
          </p>

          <h2 className="mt-2 max-w-3xl text-lg sm:text-xl md:text-2xl font-bold text-heading leading-snug">
            {courseTitle}
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Giảng viên hướng dẫn:{" "}
            <span className="font-semibold text-heading">{instructorName}</span>
          </p>
        </div>

        {/* Divider Bar */}
        <div className="relative z-10 my-3 flex items-center justify-center">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {/* Bottom Section: 4 Columns (Metadata, Instructor Signature, Academic Board, Security Stamp & QR) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 sm:gap-4 items-center text-xs text-slate-600 pt-2">
          {/* Column 1: Issuance Date & Verification Number */}
          <div className="text-center sm:text-left flex flex-col justify-center space-y-1 sm:space-y-1.5">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Ngày cấp chứng nhận
              </p>
              <p className="font-bold text-heading text-xs sm:text-sm">{formattedDate}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Mã chứng nhận
              </p>
              <p className="font-mono text-xs font-bold text-primary break-all">
                {certificateNumber}
              </p>
            </div>
            <div>
              <p className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">
                Mã băm bảo mật (SEC-HASH)
              </p>
              <p className="font-mono text-[10px] font-bold text-slate-600">{secHash}</p>
            </div>
          </div>

          {/* Column 2: Instructor Digital Signature */}
          <div className="flex flex-col items-center justify-center text-center">
            {/* Stylized SVG script signature */}
            <div
              className="h-11 flex items-center justify-center text-primary/85 select-none"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 160 48"
                className="h-10 w-32 stroke-[#20b486] fill-none"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 12 36 Q 30 10, 48 24 T 80 18 Q 110 32, 130 14 T 150 28" />
                <path d="M 28 32 C 40 42, 60 44, 90 38" />
              </svg>
            </div>
            <div className="h-px w-28 sm:w-32 bg-slate-300 my-1" />
            <p className="text-[10.5px] font-bold text-heading">Giảng viên phụ trách</p>
            <p className="text-[10px] text-slate-500 font-medium">{instructorName}</p>
          </div>

          {/* Column 3: EduAlto Academic Board Signature & Stamp */}
          <div className="flex flex-col items-center justify-center text-center">
            {/* Academic Board Stylized Signature */}
            <div
              className="h-11 flex items-center justify-center text-[#159E75]/85 select-none"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 160 48"
                className="h-10 w-32 stroke-[#159E75] fill-none"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 16 30 Q 35 12, 55 26 T 95 16 Q 125 30, 145 16" />
                <circle cx="85" cy="22" r="6" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="h-px w-28 sm:w-32 bg-slate-300 my-1" />
            <p className="text-[10.5px] font-bold text-heading">Hội đồng Đào tạo EduAlto</p>
            <p className="text-[10px] text-slate-500 font-medium">EduAlto Academic Board</p>
          </div>

          {/* Column 4: Security Stamp & QR Code */}
          <div className="flex items-center justify-center gap-3 sm:justify-end">
            {/* Tem bảo mật vector 36-point rosette */}
            <div className="flex flex-col items-center justify-center text-center shrink-0">
              <div className="relative flex h-18 w-18 sm:h-20 sm:w-20 flex-col items-center justify-center rounded-full border-2 border-dashed border-[#D4AF37] bg-gradient-to-br from-[#FAFAF5] to-[#EAF7F3] p-1 shadow-xs">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-primary/40 bg-white/95 px-0.5 text-center">
                  <span className="text-[8px] sm:text-[8.5px] font-bold text-heading leading-tight">
                    TEM BẢO MẬT
                  </span>
                  <span className="text-[7px] sm:text-[7.5px] font-bold text-[#B8860B] leading-tight">
                    CHỐNG LÀM GIẢ
                  </span>
                  <div className="my-0.5 flex items-center justify-center gap-0.5 text-[7px] sm:text-[8px] text-[#D4AF37]">
                    {"★".repeat(5)}
                  </div>
                  <span className="text-[6.5px] sm:text-[7px] font-bold text-primary leading-tight">
                    EDUALTO VERIFIED
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code Container */}
            {qrCodeDataUrl ? (
              <div className="flex flex-col items-center shrink-0">
                <img
                  src={qrCodeDataUrl}
                  alt="Mã QR xác thực chứng chỉ"
                  className="h-16 w-16 sm:h-18 sm:w-18 rounded border border-slate-200 bg-white p-1 shadow-2xs"
                />
                {verificationUrl ? (
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-[8.5px] font-semibold text-primary hover:underline"
                  >
                    Quét xác thực
                  </a>
                ) : (
                  <span className="mt-1 text-[8.5px] font-semibold text-primary">
                    Quét xác thực
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    );
  },
);
