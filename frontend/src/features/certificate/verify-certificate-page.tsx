"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  Loader2,
  Share2,
  ShieldAlert,
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
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(value));
}

export function VerifyCertificatePage({ code }: { code: string }) {
  const [data, setData] = useState<CertificateVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

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
    void load();
  }, [load]);

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
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert(`Liên kết xác thực:\n${window.location.href}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#101a2c]">
      <AppHeader />

      <main className="container-page max-w-4xl py-10">
        {loading ? (
          <div
            role="status"
            aria-label="Đang xác thực chứng chỉ"
            className="flex flex-col items-center justify-center py-20"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              Đang kiểm tra tính xác thực...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs md:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <ShieldAlert className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-xl font-bold text-rose-900 md:text-2xl">
              Không thể xác thực chứng chỉ
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Mã xác thực{" "}
              <code className="rounded bg-slate-100 px-2 py-0.5 font-mono font-semibold text-rose-700">
                {code}
              </code>{" "}
              không tồn tại trên hệ thống EduAlto hoặc chưa từng được cấp.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void load()}
                className="focus-ring rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Kiểm tra lại
              </button>
              <Link
                href="/courses"
                className="focus-ring rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#159e75]"
              >
                Khám phá khóa học EduAlto
              </Link>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="flex flex-col items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                  <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-emerald-950 sm:text-xl">
                    Chứng nhận hợp lệ & Đã xác thực
                  </h1>
                  <p className="text-xs text-emerald-800 sm:text-sm">
                    Chứng chỉ được cấp chính thức bởi EduAlto và bảo lưu hồ sơ trên hệ thống.
                  </p>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 shadow-2xs hover:bg-emerald-50 sm:flex-initial"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Đã sao chép
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Sao chép liên kết
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#159e75] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Đang
                      tải...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" aria-hidden="true" /> Tải PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Certificate Details Card */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs md:p-10">
              <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#e8faf4] px-2.5 py-1 text-xs font-semibold text-primary">
                      <Award className="h-4 w-4" aria-hidden="true" /> EduAlto E-Certificate
                    </span>
                    <h2 className="mt-4 text-2xl font-bold text-heading sm:text-3xl">
                      {data.courseTitle}
                    </h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <UserCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Học
                        viên nhận chứng nhận
                      </p>
                      <p className="mt-1.5 text-base font-bold text-heading">{data.studentName}</p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Ngày
                        cấp
                      </p>
                      <p className="mt-1.5 text-base font-bold text-heading">
                        {formatDate(data.issuedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-5 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-500">Giảng viên hướng dẫn:</span>{" "}
                      <span className="font-semibold text-heading">{data.instructorName}</span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Mã xác thực điện tử:</span>{" "}
                      <span className="font-mono font-bold text-primary">
                        {data.certificateNumber}
                      </span>
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/courses/${data.courseId}`}
                      className="focus-ring inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" /> Xem chi tiết khóa học này
                    </Link>
                  </div>
                </div>

                {/* QR Box */}
                {data.qrCodeDataUrl && (
                  <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-center">
                    <img
                      src={data.qrCodeDataUrl}
                      alt={`Mã QR xác thực chứng chỉ ${data.certificateNumber}`}
                      className="h-36 w-36 rounded-lg border border-slate-200 bg-white p-2 shadow-2xs"
                    />
                    <p className="mt-3 text-xs font-semibold text-heading">MÃ QR XÁC THỰC</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Quét bằng camera điện thoại</p>
                  </div>
                )}
              </div>
            </article>
          </div>
        ) : null}
      </main>
    </div>
  );
}
