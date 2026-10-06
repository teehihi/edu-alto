"use client";

import Link from "next/link";
import { Award, CalendarDays, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiClientError } from "@/lib/api";
import { useAuthSession } from "@/lib/auth-session";
import { fetchMyCertificates, type CourseCertificate } from "@/lib/certificate-client";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(value));
}

export function CertificateListView() {
  const { getAccessToken } = useAuthSession();
  const [items, setItems] = useState<CourseCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setItems(await fetchMyCertificates(token));
    } catch (reason) {
      setError(
        reason instanceof ApiClientError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : "Không thể tải chứng chỉ của bạn.",
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải chứng chỉ">
        {[0, 1, 2].map((item) => (
          <div key={item} className="skeleton h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-white p-7 text-center">
        <p className="text-sm text-rose-800">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="focus-ring mt-3 rounded px-3 py-2 text-sm font-semibold text-primary hover:bg-emerald-50"
        >
          Thử tải lại
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
        <Award className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-base font-semibold text-heading">Bạn chưa có chứng chỉ</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Hoàn thành tất cả bài học đang xuất bản trong một khóa học để nhận chứng nhận hoàn thành.
        </p>
        <Link
          href="/learning/courses"
          className="focus-ring mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75]"
        >
          Tiếp tục học
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((certificate) => (
        <article
          key={certificate.id}
          className="flex min-h-48 flex-col rounded-xl border border-[#dcebe5] bg-white p-5 shadow-sm"
        >
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#e8faf4] text-primary">
            <Award className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 line-clamp-2 text-base font-semibold text-heading">
            {certificate.courseTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">Giảng viên: {certificate.instructorName}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Cấp ngày{" "}
            {formatDate(certificate.issuedAt)}
          </p>
          <Link
            href={`/learning/certificates/${encodeURIComponent(certificate.courseId)}`}
            className="focus-ring mt-auto inline-flex min-h-10 items-center justify-between rounded-md px-2 pt-3 text-sm font-semibold text-primary hover:underline"
          >
            Xem chứng chỉ <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
  );
}
