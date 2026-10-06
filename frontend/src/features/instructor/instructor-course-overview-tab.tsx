"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChartNoAxesCombined, CircleAlert, RefreshCw } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import { formatVND } from "@/lib/format";
import {
  fetchInstructorCourseRevenueSummary,
  type InstructorCourseRevenueSummary,
} from "@/lib/instructor-revenue-client";
import { useInstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

export function InstructorCourseOverviewTab() {
  const { accessToken, course } = useInstructorCourseWorkspace();
  const [summary, setSummary] = useState<InstructorCourseRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setError("Vui lòng đăng nhập để xem doanh thu khóa học.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setSummary(await fetchInstructorCourseRevenueSummary(accessToken, course.id));
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể tải doanh thu khóa học. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, course.id]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const periods = summary?.periods ?? [];
  const maximum = Math.max(...periods.map((period) => period.netAmount), 0);
  const cards = [
    { label: "Doanh thu đã thanh toán", value: summary ? formatVND(summary.paidNetAmount) : "—" },
    {
      label: "Giao dịch đã thanh toán",
      value: summary?.paidTransactionCount.toLocaleString("vi-VN") ?? "—",
    },
    {
      label: "Đơn hàng đang chờ",
      value: summary?.pendingTransactionCount.toLocaleString("vi-VN") ?? "—",
    },
  ];

  return (
    <section aria-labelledby="course-commission-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="course-commission-heading" className="text-lg font-semibold text-slate-900">
            Doanh thu khóa học
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Số tiền sau ưu đãi, trước khi trừ phí nền tảng.
          </p>
        </div>
        <Link
          href="/instructor/revenue"
          className="focus-ring inline-flex min-h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-primary transition hover:bg-emerald-50 active:bg-emerald-100"
        >
          Xem toàn bộ doanh thu
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-center gap-3 rounded-lg border border-rose-200 bg-white p-4 text-sm text-rose-800"
        >
          <CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="focus-ring rounded px-2 py-1 font-semibold hover:bg-rose-50"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-slate-600">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {loading ? (
                <span className="inline-block h-6 w-24 animate-pulse rounded bg-slate-200" />
              ) : (
                card.value
              )}
            </p>
          </article>
        ))}
      </div>

      <section
        aria-label="Doanh thu theo tháng"
        className="mt-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
      >
        <h3 className="text-sm font-semibold text-slate-800">12 tháng gần nhất</h3>
        {loading ? (
          <div
            className="mt-4 flex h-40 items-center justify-center text-sm text-slate-500"
            role="status"
          >
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Đang tải doanh
            thu…
          </div>
        ) : periods.length === 0 || maximum === 0 ? (
          <div className="mt-3 flex min-h-36 flex-col items-center justify-center text-center">
            <ChartNoAxesCombined className="h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-2 text-sm text-slate-600">
              Chưa có giao dịch đã thanh toán trong 12 tháng gần nhất.
            </p>
          </div>
        ) : (
          <div
            className="mt-4 flex h-40 items-end gap-2 overflow-x-auto pb-1"
            role="img"
            aria-label="Biểu đồ doanh thu đã thanh toán theo tháng"
          >
            {periods.map((period) => {
              const height =
                period.netAmount === 0 ? 2 : Math.max(4, (period.netAmount / maximum) * 112);
              return (
                <div key={period.label} className="flex h-full min-w-8 flex-1 flex-col justify-end">
                  <div
                    title={`${period.label}: ${formatVND(period.netAmount)}`}
                    className={`mx-auto w-full max-w-8 rounded-t ${period.netAmount > 0 ? "bg-primary" : "bg-slate-200"}`}
                    style={{ height: `${height}px` }}
                  />
                  <span className="mt-2 text-center text-[9px] text-slate-500">
                    {period.label.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
