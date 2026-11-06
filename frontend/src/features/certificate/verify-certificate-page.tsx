"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AppHeader } from "@/components/layout/app-header";
import { ApiClientError } from "@/lib/api";
import {
  downloadPublicCertificatePdf,
  verifyCertificate,
  type CertificateVerificationResult,
} from "@/lib/certificate-client";
import { CertificateSheet } from "@/features/certificate/certificate-sheet";
import { CertificateShareModal } from "@/features/certificate/certificate-share-modal";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "full",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function VerifyCertificatePage({
  code,
  initialData,
}: {
  code: string;
  initialData?: CertificateVerificationResult | null;
}) {
  const [data, setData] = useState<CertificateVerificationResult | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const certificateRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await verifyCertificate(code);
      setData(res);
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không tìm thấy chứng chỉ này.",
      );
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (!initialData) {
      void load();
    }
  }, [initialData, load]);

  const handleDownload = async () => {
    if (!data || downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadPublicCertificatePdf(code);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${data.certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Không thể tải file PDF chứng chỉ.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!certificateRef.current || !data || downloadingImage) return;
    setDownloadingImage(true);
    try {
      const dataUrl = await toPng(certificateRef.current, {
        cacheBust: true,
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `certificate-${data.certificateNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert("Không thể xuất ảnh chứng chỉ lúc này. Vui lòng thử lại hoặc tải file PDF.");
    } finally {
      setDownloadingImage(false);
    }
  };

  const handleCopyLink = async () => {
    const targetUrl =
      data?.verificationUrl ||
      (typeof window !== "undefined"
        ? window.location.href
        : `https://edualto.vn/certificates/verify/${code}`);

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(targetUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      } catch {
        // Fallback
      }
    }

    setShareModalOpen(true);
  };

  const handleCopyCode = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.certificateNumber);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#101a2c]">
      <AppHeader />

      <main className="container-page max-w-5xl py-8 md:py-12">
        {loading ? (
          <div
            role="status"
            aria-label="Đang xác thực chứng chỉ"
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-primary shadow-xs">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-heading">Đang kiểm tra tính xác thực...</h2>
            <p className="mt-1 text-sm text-slate-500">
              Đối soát thông tin chứng chỉ và tem bảo mật với cơ sở dữ liệu EduAlto
            </p>
          </div>
        ) : error ? (
          <section
            role="alert"
            className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs md:p-12"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-2xs">
              <ShieldAlert className="h-9 w-9" aria-hidden="true" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-rose-950">Không thể xác thực chứng chỉ</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Mã xác thực{" "}
              <code className="rounded bg-slate-100 px-2 py-0.5 font-mono font-semibold text-rose-700">
                {code}
              </code>{" "}
              không tồn tại trên hệ thống EduAlto hoặc chưa từng được cấp. Vui lòng kiểm tra lại mã
              QR trên văn bằng gốc.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void load()}
                className="focus-ring rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                Kiểm tra lại
              </button>
              <Link
                href="/courses"
                className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-2xs hover:bg-[#159e75]"
              >
                Khám phá khóa học EduAlto
              </Link>
            </div>
          </section>
        ) : data ? (
          <div className="space-y-8">
            {/* 1. Verified Official Banner */}
            <section className="relative overflow-hidden rounded-2xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 via-[#f2faf7] to-white p-6 shadow-xs md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm ring-4 ring-emerald-100">
                    <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        XÁC THỰC CHÍNH THỨC
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                        Tem bảo mật hợp lệ
                      </span>
                    </div>

                    <h1 className="mt-2 text-2xl font-bold text-heading md:text-3xl">
                      Chứng nhận hợp lệ &amp; Đã xác thực
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">
                      Chứng chỉ hoàn thành khóa học được cấp chính thức bởi EduAlto và bảo lưu hồ sơ
                      điện tử vĩnh viễn trên hệ thống.
                    </p>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-heading shadow-2xs hover:bg-slate-50 transition active:scale-95"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4 text-primary" aria-hidden="true" /> Đã sao chép
                        liên kết
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 text-slate-600" aria-hidden="true" /> Chia sẻ
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDownloadPng()}
                    disabled={downloadingImage}
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-60 active:scale-95"
                  >
                    {downloadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />{" "}
                        Đang xuất ảnh...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Tải ảnh
                        (PNG)
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#159e75] transition disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Đang tải
                        PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" aria-hidden="true" /> Tải file PDF gốc
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* 2. Key Identity & Issuance Metrics Grid */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Student Identity */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Học viên được cấp</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-primary">
                    <UserCheck className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-3 text-lg font-bold text-heading">{data.studentName}</p>
                <p className="mt-0.5 text-xs text-emerald-700">Đã hoàn thành 100% nội dung</p>
              </div>

              {/* Issue Date */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Ngày cấp chính thức</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-3 text-lg font-bold text-heading">
                  {formatShortDate(data.issuedAt)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{formatDate(data.issuedAt)}</p>
              </div>

              {/* Certificate Number */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Mã xác thực điện tử</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    title="Sao chép mã chứng chỉ"
                    className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-heading"
                  >
                    {copiedCode ? (
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="mt-3 font-mono text-xs font-bold text-primary break-all">
                  {data.certificateNumber}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Mã định danh duy nhất</p>
              </div>

              {/* Instructor & Platform */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Giảng viên hướng dẫn</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Award className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-3 text-lg font-bold text-heading">{data.instructorName}</p>
                <p className="mt-0.5 text-xs text-slate-500">Nền tảng đào tạo EduAlto</p>
              </div>
            </section>

            {/* 3. Certificate Visual Replica Card with Anti-Counterfeit Security Stamp & Signatures */}
            <div className="mt-4">
              <CertificateSheet
                ref={certificateRef}
                studentName={data.studentName}
                courseTitle={data.courseTitle}
                instructorName={data.instructorName}
                certificateNumber={data.certificateNumber}
                issuedAt={data.issuedAt}
                qrCodeDataUrl={data.qrCodeDataUrl}
                verificationUrl={data.verificationUrl}
              />
            </div>

            {/* 4. Course Details & Public Exploration Callout */}
            <section className="flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-semibold text-primary uppercase">
                  Khóa học hoàn thành
                </span>
                <h4 className="mt-1 text-lg font-bold text-heading">{data.courseTitle}</h4>
                <p className="text-xs text-slate-500">
                  Chương trình đào tạo chuyên sâu được giảng dạy bởi {data.instructorName} trên
                  EduAlto.
                </p>
              </div>

              <Link
                href={`/courses/${data.courseId}`}
                className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                Xem nội dung khóa học <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </section>

            {/* Quick Share Modal */}
            <CertificateShareModal
              open={shareModalOpen}
              onClose={() => setShareModalOpen(false)}
              title={`Xác thực chứng chỉ: ${data.courseTitle}`}
              url={
                data.verificationUrl ||
                (typeof window !== "undefined"
                  ? `${window.location.origin}/certificates/verify/${encodeURIComponent(data.certificateNumber)}`
                  : "")
              }
              studentName={data.studentName}
              courseTitle={data.courseTitle}
              certificateNumber={data.certificateNumber}
            />
          </div>
        ) : null}
      </main>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          .certificate-print-sheet,
          .certificate-print-sheet * {
            visibility: visible;
          }
          .certificate-print-sheet {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 100vh !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-width: 6px !important;
          }
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
