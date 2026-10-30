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
  Loader2,
  QrCode,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ApiClientError } from "@/lib/api";
import {
  downloadPublicCertificatePdf,
  verifyCertificate,
  type CertificateVerificationResult,
} from "@/lib/certificate-client";

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  const handleCopyLink = async () => {
    const targetUrl =
      data?.verificationUrl ||
      (typeof window !== "undefined"
        ? window.location.href
        : `https://edualto.vn/certificates/verify/${code}`);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Xác thực chứng chỉ EduAlto: ${data?.studentName ?? code}`,
          text: `Chứng chỉ hoàn thành khóa học "${data?.courseTitle}" cấp cho ${data?.studentName} trên hệ thống EduAlto.`,
          url: targetUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      alert(`Liên kết xác thực:\n${targetUrl}`);
    }
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
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-heading shadow-2xs hover:bg-slate-50"
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
                    onClick={handleDownload}
                    disabled={downloading}
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#159e75] disabled:cursor-not-allowed disabled:opacity-60"
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

            {/* 3. Certificate Visual Replica Card with Anti-Counterfeit Security Stamp */}
            <article className="relative overflow-hidden rounded-2xl border-4 border-double border-[#20b486] bg-white p-6 shadow-sm md:p-12">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mb-3 flex flex-col items-center justify-center">
                  <img
                    src="/images/logo-with-text.png"
                    alt="EduAlto Logo"
                    className="h-12 w-auto object-contain sm:h-14"
                  />
                  <span className="mt-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                    EduAlto Official E-Certificate
                  </span>
                </div>

                <h2 className="mt-4 text-2xl font-bold text-heading sm:text-3xl md:text-4xl">
                  Chứng nhận hoàn thành
                </h2>
                <p className="mt-3 text-sm text-slate-500">Chứng nhận rằng học viên</p>

                <p className="mt-2 text-2xl font-bold text-primary sm:text-3xl">
                  {data.studentName}
                </p>
                <div className="mx-auto mt-2 h-0.5 w-32 bg-primary/40" />

                <p className="mt-4 text-sm text-slate-600">
                  đã hoàn thành xuất sắc toàn bộ nội dung xuất bản của khóa học
                </p>

                <h3 className="mt-2 text-xl font-bold text-heading sm:text-2xl">
                  {data.courseTitle}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Giảng viên hướng dẫn:{" "}
                  <span className="font-semibold text-heading">{data.instructorName}</span>
                </p>

                {/* Footer of the visual certificate */}
                <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-slate-100 pt-6 sm:flex-row">
                  {/* Left: Issue Date & Verification ID */}
                  <div className="text-center sm:text-left">
                    <p className="text-xs font-medium text-slate-500">Ngày cấp chứng chỉ</p>
                    <p className="mt-0.5 text-sm font-bold text-heading">
                      {formatShortDate(data.issuedAt)}
                    </p>
                    <p className="mt-3 text-xs font-medium text-slate-500">Mã số văn bằng</p>
                    <p className="mt-0.5 font-mono text-xs font-bold text-primary">
                      {data.certificateNumber}
                    </p>
                  </div>

                  {/* Center: Official Anti-Counterfeit Security Seal Stamp */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="relative flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full border-2 border-dashed border-[#D4AF37] bg-gradient-to-br from-[#FAFAF5] to-[#EAF7F3] p-1.5 shadow-xs">
                      <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-primary/40 bg-white/95 px-1 text-center">
                        <span className="text-[8.5px] font-bold text-heading">TEM BẢO MẬT</span>
                        <span className="text-[7.5px] font-bold text-[#B8860B]">CHỐNG LÀM GIẢ</span>
                        <div className="my-0.5 flex items-center justify-center gap-0.5 text-[8.5px] text-[#D4AF37]">
                          {"★".repeat(5)}
                        </div>
                        <span className="text-[7px] font-bold text-primary">EDUALTO VERIFIED</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-heading">
                      HỆ THỐNG CHỨNG THỰC ĐIỆN TỬ
                    </p>
                    <p className="text-[10px] text-slate-500">Bảo lưu &amp; đối soát bởi EduAlto</p>
                  </div>

                  {/* Right: Dynamic QR Code */}
                  <div className="flex flex-col items-center sm:items-end">
                    {data.qrCodeDataUrl ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={data.qrCodeDataUrl}
                          alt={`Mã QR xác thực chứng chỉ ${data.certificateNumber}`}
                          className="h-20 w-20 rounded-lg border border-slate-200 bg-white p-1 shadow-2xs"
                        />
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                          <QrCode className="h-3 w-3" aria-hidden="true" /> Quét mã để đối soát
                        </span>
                      </div>
                    ) : (
                      <div className="text-center sm:text-right">
                        <p className="text-xs text-slate-500">Xác thực trực tuyến tại</p>
                        <p className="mt-0.5 font-mono text-xs font-bold text-primary">
                          edualto.vn/verify
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>

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
          </div>
        ) : null}
      </main>
    </div>
  );
}
