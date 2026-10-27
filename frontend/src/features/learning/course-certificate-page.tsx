"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  ArrowLeft,
  Check,
  Download,
  ExternalLink,
  Loader2,
  Printer,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import {
  downloadCertificatePdf,
  fetchMyCourseCertificate,
  type CourseCertificate,
} from "@/lib/certificate-client";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(value));
}

export function CourseCertificatePage({ courseId }: { courseId: string }) {
  const { user, isLoading: sessionLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const [certificate, setCertificate] = useState<CourseCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setCertificate(await fetchMyCourseCertificate(courseId, token, origin));
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể tải chứng chỉ.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, getAccessToken]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/learning/certificates/${courseId}`)}`);
      return;
    }
    void load();
  }, [courseId, load, router, sessionLoading, user]);

  const handleDownloadPdf = async () => {
    if (!certificate || downloading) return;
    setDownloading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const blob = await downloadCertificatePdf(courseId, token, origin);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${certificate.certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Không thể tải xuống file PDF chứng chỉ.");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!certificate) return;
    const verifyUrl =
      certificate.verificationUrl ||
      `${window.location.origin}/certificates/verify/${encodeURIComponent(certificate.certificateNumber)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Chứng nhận hoàn thành: ${certificate.courseTitle}`,
          text: `Chứng nhận hoàn thành khóa học "${certificate.courseTitle}" cấp cho ${certificate.studentName} trên EduAlto.`,
          url: verifyUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert(`Liên kết xác thực chứng chỉ của bạn:\n${verifyUrl}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#101a2c]">
      <AppHeader />
      <main className="container-page py-8 md:py-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between print:hidden">
          <Link
            href="/learning/certificates"
            className="focus-ring inline-flex items-center gap-2 rounded text-sm font-medium text-slate-600 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Danh sách chứng chỉ
          </Link>
          {copied && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Đã sao chép liên kết xác thực!
            </span>
          )}
        </div>

        {loading || sessionLoading ? (
          <div
            role="status"
            aria-label="Đang tải chứng chỉ"
            className="mx-auto mt-8 h-[430px] max-w-5xl animate-pulse rounded-2xl bg-white shadow-sm"
          />
        ) : error ? (
          <section
            role="alert"
            className="mx-auto mt-8 max-w-xl rounded-xl border border-rose-200 bg-white p-8 text-center print:hidden"
          >
            <h1 className="font-semibold text-rose-800">Chưa thể mở chứng chỉ</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="focus-ring mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#159e75]"
            >
              Thử lại
            </button>
          </section>
        ) : certificate ? (
          <>
            <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-end gap-2.5 print:hidden">
              <button
                type="button"
                onClick={handleShare}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-heading shadow-xs hover:bg-slate-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" /> Đã sao chép
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 text-slate-600" aria-hidden="true" /> Chia sẻ
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Đang tạo PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden="true" /> Tải PDF chứng chỉ
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                <Printer className="h-4 w-4 text-slate-600" aria-hidden="true" /> In chứng chỉ
              </button>
            </div>

            <article className="certificate-print-sheet mx-auto mt-4 flex min-h-[440px] max-w-5xl flex-col items-center justify-center rounded-2xl border-[8px] border-double border-[#20b486] bg-white px-6 py-10 text-center shadow-sm sm:min-h-[580px] sm:px-16">
              <Award className="h-12 w-12 text-primary print:h-16 print:w-16" aria-hidden="true" />
              <p className="mt-3 text-xs font-semibold tracking-[0.28em] text-primary">EDUALTO</p>
              <h1 className="mt-4 text-3xl font-semibold text-heading sm:text-4xl">
                Chứng nhận hoàn thành
              </h1>
              <p className="mt-5 text-sm text-slate-500">Chứng nhận rằng</p>
              <p className="mt-2 text-2xl font-semibold text-primary sm:text-3xl">
                {certificate.studentName}
              </p>
              <div className="mx-auto mt-2 h-0.5 w-40 bg-primary/40" />

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
                đã hoàn thành xuất sắc toàn bộ nội dung xuất bản của khóa học
              </p>
              <h2 className="mt-2 max-w-3xl text-xl font-semibold text-heading sm:text-2xl">
                {certificate.courseTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Giảng viên hướng dẫn: {certificate.instructorName}
              </p>

              <div className="mt-10 flex w-full flex-col items-center justify-between gap-6 border-t border-slate-100 pt-6 text-sm sm:flex-row">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-medium text-slate-500">Ngày cấp</p>
                  <p className="mt-1 font-semibold text-heading">
                    {formatDate(certificate.issuedAt)}
                  </p>
                  <p className="mt-3 text-xs font-medium text-slate-500">Mã chứng nhận</p>
                  <p className="mt-1 font-mono text-xs font-bold text-primary">
                    {certificate.certificateNumber}
                  </p>
                </div>

                <div className="hidden flex-col items-center justify-center text-center sm:flex">
                  <p className="text-[11px] font-semibold text-heading">
                    HỆ THỐNG CHỨNG CHỈ ĐIỆN TỬ
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Bảo lưu và xác thực bởi EduAlto
                  </p>
                </div>

                <div className="flex flex-col items-center sm:items-end">
                  {certificate.qrCodeDataUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={certificate.qrCodeDataUrl}
                        alt="Mã QR xác thực chứng chỉ"
                        className="h-20 w-20 rounded border border-slate-200 bg-white p-1 shadow-2xs"
                      />
                      <Link
                        href={
                          certificate.verificationUrl ||
                          `/certificates/verify/${encodeURIComponent(certificate.certificateNumber)}`
                        }
                        target="_blank"
                        className="focus-ring mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        Quét để xác thực <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center sm:text-right">
                      <p className="text-xs text-slate-500">Xác thực tại</p>
                      <p className="mt-1 font-mono text-xs text-primary">edualto.vn/verify</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          </>
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
