"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, ArrowLeft, Printer } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { fetchMyCourseCertificate, type CourseCertificate } from "@/lib/certificate-client";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(value));
}

export function CourseCertificatePage({ courseId }: { courseId: string }) {
  const { user, isLoading: sessionLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const [certificate, setCertificate] = useState<CourseCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setCertificate(await fetchMyCourseCertificate(courseId, token));
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

  return (
    <div className="min-h-screen bg-[#f8fbfa] text-[#101a2c]">
      <AppHeader />
      <main className="container-page py-8 md:py-12">
        <Link
          href="/learning/certificates"
          className="focus-ring inline-flex items-center gap-2 rounded text-sm font-medium text-slate-600 hover:text-primary print:hidden"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Chứng chỉ của tôi
        </Link>
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
            <h1 className="font-semibold">Chưa thể mở chứng chỉ</h1>
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
            <div className="mx-auto mt-6 flex max-w-5xl justify-end print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]"
              >
                <Printer className="h-4 w-4" aria-hidden="true" /> In chứng chỉ
              </button>
            </div>
            <article className="certificate-print-sheet mx-auto mt-3 flex min-h-[420px] max-w-5xl flex-col items-center justify-center border-[10px] border-double border-[#20b486] bg-white px-6 py-10 text-center shadow-sm sm:min-h-[560px] sm:px-16">
              <Award className="h-12 w-12 text-primary print:h-16 print:w-16" aria-hidden="true" />
              <p className="mt-4 text-xs font-semibold tracking-[0.28em] text-primary">EDUALTO</p>
              <h1 className="mt-5 text-3xl font-semibold text-heading sm:text-4xl">
                Chứng nhận hoàn thành
              </h1>
              <p className="mt-5 text-sm text-slate-500">Chứng nhận rằng</p>
              <p className="mt-2 text-2xl font-semibold text-primary sm:text-3xl">
                {certificate.studentName}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
                đã hoàn thành toàn bộ nội dung đang xuất bản của khóa học
              </p>
              <h2 className="mt-2 max-w-3xl text-xl font-semibold text-heading sm:text-2xl">
                {certificate.courseTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Giảng viên: {certificate.instructorName}
              </p>
              <div className="mt-10 flex w-full flex-col items-center justify-between gap-6 border-t border-slate-100 pt-5 text-sm sm:flex-row">
                <div className="text-center sm:text-left">
                  <p className="text-xs text-slate-500">Ngày cấp</p>
                  <p className="mt-1 font-medium text-heading">
                    {formatDate(certificate.issuedAt)}
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs text-slate-500">Mã chứng nhận</p>
                  <p className="mt-1 font-mono text-xs font-medium text-heading">
                    {certificate.certificateNumber}
                  </p>
                </div>
              </div>
            </article>
          </>
        ) : null}
      </main>
      <style jsx global>{`
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
          }
          @page {
            size: landscape;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
