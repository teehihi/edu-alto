"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  Image as ImageIcon,
  Loader2,
  Printer,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AppHeader } from "@/components/layout/app-header";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import {
  downloadCertificatePdf,
  fetchMyCourseCertificate,
  type CourseCertificate,
} from "@/lib/certificate-client";
import { CertificateSheet } from "@/features/certificate/certificate-sheet";
import { CertificateShareModal } from "@/features/certificate/certificate-share-modal";

export function CourseCertificatePage({ courseId }: { courseId: string }) {
  const { user, isLoading: sessionLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const [certificate, setCertificate] = useState<CourseCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const certificateRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadPng = async () => {
    if (!certificateRef.current || !certificate || downloadingImage) return;
    setDownloadingImage(true);
    try {
      const dataUrl = await toPng(certificateRef.current, {
        cacheBust: true,
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `certificate-${certificate.certificateNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert("Không thể xuất ảnh chứng chỉ lúc này. Vui lòng thử lại hoặc tải file PDF.");
    } finally {
      setDownloadingImage(false);
    }
  };

  const handleShare = async () => {
    if (!certificate) return;
    const verifyUrl =
      certificate.verificationUrl ||
      `${window.location.origin}/certificates/verify/${encodeURIComponent(certificate.certificateNumber)}`;

    // Copy to clipboard for immediate utility and tests
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(verifyUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // Fallback
      }
    }

    // Open share modal
    setShareModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#101a2c]">
      <AppHeader />
      <main className="container-page py-8 md:py-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between print:hidden">
          <Link
            href="/learning/certificates"
            className="focus-ring inline-flex items-center gap-2 rounded text-sm font-medium text-slate-600 hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Danh sách chứng chỉ
          </Link>
          {copied && (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 animate-in fade-in"
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
            {/* Action Bar */}
            <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-end gap-2.5 print:hidden">
              <button
                type="button"
                onClick={handleShare}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-heading shadow-xs hover:bg-slate-50 transition active:scale-95"
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
                onClick={() => void handleDownloadPng()}
                disabled={downloadingImage}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-60 active:scale-95"
              >
                {downloadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />{" "}
                    Đang xuất ảnh...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" /> Tải ảnh (PNG)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-xs hover:bg-[#159e75] transition disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
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
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-95"
              >
                <Printer className="h-4 w-4 text-slate-600" aria-hidden="true" /> In chứng chỉ
              </button>
            </div>

            {/* Standardized A4 Landscape Certificate Sheet */}
            <div className="mt-4">
              <CertificateSheet
                ref={certificateRef}
                studentName={certificate.studentName}
                courseTitle={certificate.courseTitle}
                instructorName={certificate.instructorName}
                certificateNumber={certificate.certificateNumber}
                issuedAt={certificate.issuedAt}
                qrCodeDataUrl={certificate.qrCodeDataUrl}
                verificationUrl={certificate.verificationUrl}
              />
            </div>

            {/* Quick Share Modal */}
            <CertificateShareModal
              open={shareModalOpen}
              onClose={() => setShareModalOpen(false)}
              title={`Chứng nhận hoàn thành: ${certificate.courseTitle}`}
              url={
                certificate.verificationUrl ||
                (typeof window !== "undefined"
                  ? `${window.location.origin}/certificates/verify/${encodeURIComponent(certificate.certificateNumber)}`
                  : "")
              }
              studentName={certificate.studentName}
              courseTitle={certificate.courseTitle}
              certificateNumber={certificate.certificateNumber}
            />
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
