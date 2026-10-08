"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChartNoAxesCombined,
  ChevronDown,
  CircleAlert,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiClientError } from "@/lib/api";
import { formatVNDAmount } from "@/lib/format";
import {
  fetchInstructorRevenueSummary,
  fetchInstructorRevenueTransactions,
  type InstructorRevenueStatus,
  type InstructorRevenueSummary,
  type InstructorRevenueTransaction,
  type RevenueDateRange,
} from "@/lib/instructor-revenue-client";

type RevenuePeriod = "all" | "month" | "quarter" | "year";
type RevenueStatusFilter = InstructorRevenueStatus | "all";

const periodLabels: Record<RevenuePeriod, string> = {
  all: "Tất cả thời gian",
  month: "Tháng này",
  quarter: "Quý này",
  year: "Năm nay",
};

const statusLabels: Record<RevenueStatusFilter, string> = {
  all: "Tất cả trạng thái",
  PAID: "Đã thanh toán",
  PENDING_PAYMENT: "Chờ thanh toán",
  PAYMENT_REVIEW: "Chờ xác nhận",
  PAYMENT_FAILED: "Thanh toán thất bại",
};

function getDateRange(period: RevenuePeriod): RevenueDateRange {
  if (period === "all") return {};
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  if (period === "month") start.setMonth(now.getMonth(), 1);
  if (period === "quarter") start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
  return {
    from: formatDateParam(start),
    to: formatDateParam(now),
  };
}

function formatDateParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function getPaymentMethodLabel(method: string) {
  if (method === "VNPAY") return "VNPay";
  if (method === "MOMO") return "MoMo";
  if (method === "SEPAY") return "SePay";
  if (method === "STRIPE") return "Stripe";
  if (method === "VIETQR") return "Chuyển khoản ngân hàng";
  return method;
}

function RevenueChart({ summary }: { summary: InstructorRevenueSummary }) {
  const periods = summary.periods ?? [];
  const max = Math.max(
    ...periods.flatMap((period) => [period.netAmount, period.previousNetAmount]),
    0,
  );
  const chartWidth = 1000;
  const chartHeight = 250;
  const leftPadding = 64;
  const rightPadding = 12;
  const topPadding = 12;
  const bottomPadding = 28;
  const xAt = (index: number) =>
    periods.length < 2
      ? chartWidth / 2
      : leftPadding + (index * (chartWidth - leftPadding - rightPadding)) / (periods.length - 1);
  const yAt = (amount: number) =>
    chartHeight -
    bottomPadding -
    (max === 0 ? 0 : (amount / max) * (chartHeight - topPadding - bottomPadding));
  const makePath = (values: number[], closeToBaseline: boolean) => {
    const points = values.map((value, index) => `${xAt(index)},${yAt(value)}`);
    if (points.length === 0) return "";
    const linePath = `M ${points.join(" L ")}`;
    return closeToBaseline
      ? `${linePath} L ${xAt(values.length - 1)},${chartHeight - bottomPadding} L ${xAt(0)},${chartHeight - bottomPadding} Z`
      : linePath;
  };
  const currentValues = periods.map((period) => period.netAmount);
  const previousValues = periods.map((period) => period.previousNetAmount);
  return (
    <section aria-label="Biểu đồ doanh thu" className="rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Doanh thu 12 tháng gần nhất</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Các chỉ số tổng quan và giao dịch tuân theo khoảng thời gian đã chọn.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
            Kỳ đã chọn
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" aria-hidden="true" />
            Cùng kỳ năm trước
          </span>
        </div>
      </div>
      {periods.length === 0 || max === 0 ? (
        <div className="mt-3 flex min-h-[190px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-5 py-8 text-center sm:min-h-[220px]">
          <ChartNoAxesCombined aria-hidden="true" className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Chưa có giao dịch đã thanh toán trong 12 tháng gần nhất
          </p>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white px-4 pb-3 pt-5">
          <div
            role="img"
            aria-label={`Biểu đồ so sánh doanh thu theo tháng, kỳ đã chọn ${formatVNDAmount(summary.paidNetAmount)}`}
            className="min-w-[680px]"
          >
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="h-[220px] w-full overflow-visible sm:h-[250px]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="revenue-current-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="revenue-previous-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {Array.from({ length: 6 }, (_, index) => {
                const y = topPadding + (index * (chartHeight - topPadding - bottomPadding)) / 5;
                const value = max * (1 - index / 5);
                return (
                  <g key={index}>
                    <line
                      x1={leftPadding}
                      x2={chartWidth - rightPadding}
                      y1={y}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="3 4"
                    />
                    <text x="0" y={y + 4} fill="#94a3b8" fontSize="11">
                      {formatVNDAmount(value)}
                    </text>
                  </g>
                );
              })}
              <path d={makePath(previousValues, true)} fill="url(#revenue-previous-fill)" />
              <path d={makePath(currentValues, true)} fill="url(#revenue-current-fill)" />
              <path
                d={makePath(previousValues, false)}
                fill="none"
                stroke="#14b8a6"
                strokeWidth="2"
              />
              <path
                d={makePath(currentValues, false)}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
              />
              {periods.map((period, index) => (
                <g key={period.label}>
                  <circle cx={xAt(index)} cy={yAt(period.previousNetAmount)} r="3" fill="#14b8a6">
                    <title>{`Cùng kỳ năm trước ${period.label}: ${formatVNDAmount(period.previousNetAmount)}`}</title>
                  </circle>
                  <circle cx={xAt(index)} cy={yAt(period.netAmount)} r="3" fill="#2563eb">
                    <title>{`Kỳ đã chọn ${period.label}: ${formatVNDAmount(period.netAmount)}`}</title>
                  </circle>
                  <text
                    x={xAt(index)}
                    y={chartHeight - 3}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="11"
                  >
                    Thg {period.label.slice(5)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}

export function InstructorRevenuePage() {
  const { accessToken, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<RevenuePeriod>("all");
  const [status, setStatus] = useState<RevenueStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [summary, setSummary] = useState<InstructorRevenueSummary | null>(null);
  const [transactions, setTransactions] = useState<InstructorRevenueTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dateRange = useMemo(() => getDateRange(period), [period]);

  const loadRevenue = useCallback(async () => {
    if (authLoading) return;
    if (!accessToken) {
      setError("Vui lòng đăng nhập để xem thống kê doanh thu.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, transactionPage] = await Promise.all([
        fetchInstructorRevenueSummary(accessToken, dateRange),
        fetchInstructorRevenueTransactions(accessToken, page, search, status, dateRange),
      ]);
      setSummary(nextSummary);
      setTransactions(transactionPage.data);
      setTotalPages(transactionPage.meta.totalPages);
      setTotalElements(transactionPage.meta.totalElements);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể tải thống kê doanh thu. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, authLoading, dateRange, page, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadRevenue(), search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadRevenue, search]);

  function clearFilters() {
    setPeriod("all");
    setStatus("all");
    setSearch("");
    setPage(0);
  }

  const hasFilters = period !== "all" || status !== "all" || search.trim().length > 0;
  const cards = [
    {
      label: "Doanh thu đã thanh toán",
      value: summary ? formatVNDAmount(summary.paidNetAmount) : "—",
      note: "Tổng giá trị giao dịch",
      tone: "text-primary",
    },
    {
      label: "Giao dịch đã thanh toán",
      value: summary ? summary.paidTransactionCount.toLocaleString("vi-VN") : "—",
      note: "Theo khóa học",
      tone: "text-primary",
    },
    {
      label: "Đơn hàng đang chờ",
      value: summary ? summary.pendingTransactionCount.toLocaleString("vi-VN") : "—",
      note: "Chờ thanh toán hoặc xác nhận",
      tone: "text-amber-600",
    },
  ];

  return (
    <div className="min-w-0 bg-[#f8fafc] px-4 py-5 text-[#101a2c] sm:px-5 lg:px-6 lg:py-6">
      <div className="flex w-full flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold leading-[1.4] text-primary sm:text-2xl">
            Thống kê Doanh thu
          </h1>
          <button
            type="button"
            aria-label="Tải lại thống kê doanh thu"
            onClick={() => void loadRevenue()}
            disabled={loading}
            className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </header>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-rose-200 bg-white p-4 text-sm text-rose-800"
          >
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => void loadRevenue()}
              className="focus-ring rounded px-2 py-1 font-semibold hover:bg-rose-50"
            >
              Thử lại
            </button>
          </div>
        ) : null}

        <section aria-labelledby="revenue-overview-title">
          <div>
            <h2
              id="revenue-overview-title"
              className="text-lg font-semibold leading-[1.6] text-primary"
            >
              Tổng quan
            </h2>
            <p className="text-sm leading-[1.5] text-slate-500">
              Doanh thu là số tiền đã thanh toán sau ưu đãi, trước khi trừ phí nền tảng.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
            {cards.map((card) => (
              <article
                key={card.label}
                className="min-h-[92px] rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_0_4px_rgba(59,130,246,0.12)]"
              >
                <p
                  className={`text-2xl font-semibold leading-[1.4] ${card.tone}`}
                  aria-live="polite"
                >
                  {loading && summary === null ? "…" : card.value}
                </p>
                <p className="text-sm font-medium text-slate-700">{card.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{card.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Khoảng thời gian thống kê">
          <label className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Chọn khoảng thời gian:</span>
            <span className="relative inline-flex">
              <select
                aria-label="Khoảng thời gian doanh thu"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value as RevenuePeriod);
                  setPage(0);
                }}
                className="focus-ring min-h-10 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 font-medium text-slate-700 transition hover:border-slate-300"
              >
                {Object.entries(periodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
            </span>
          </label>
        </section>

        {summary ? <RevenueChart summary={summary} /> : null}

        <section aria-labelledby="transactions-title" className="min-w-0">
          <div className="flex items-center justify-between">
            <h2
              id="transactions-title"
              className="text-xl font-semibold leading-[1.5] text-primary"
            >
              Giao dịch
            </h2>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:max-w-[320px]">
              <span className="sr-only">Tìm theo khách hàng hoặc khóa học</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Tìm khách hàng hoặc khóa học…"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500"
              />
              <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-700" />
            </label>
            <button
              type="button"
              aria-label="Bộ lọc trạng thái giao dịch"
              aria-expanded={filtersOpen}
              aria-controls="revenue-transaction-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
            >
              <span>Lọc</span>
              <Filter aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          {filtersOpen ? (
            <div
              id="revenue-transaction-filters"
              className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <label
                htmlFor="revenue-transaction-status"
                className="text-sm font-medium text-slate-700"
              >
                Trạng thái giao dịch
              </label>
              <span className="relative inline-flex">
                <select
                  id="revenue-transaction-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as RevenueStatusFilter);
                    setPage(0);
                  }}
                  className="focus-ring min-h-10 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 transition hover:border-slate-300"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                />
              </span>
            </div>
          ) : null}

          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-white text-slate-700">
                <tr>
                  {["Khách hàng", "Khóa học", "Ngày", "Phương thức", "Giá trị"].map((heading) => (
                    <th key={heading} scope="col" className="px-3 py-3 font-normal">
                      <span className="inline-flex min-h-8 items-center gap-1 px-1 text-left">
                        {heading}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border-t border-slate-200 px-4 py-10 text-center text-slate-600"
                    >
                      <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
                      Đang tải giao dịch…
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border-t border-slate-200 px-4 py-10 text-center">
                      <p className="font-medium text-slate-700">
                        {hasFilters
                          ? "Không tìm thấy giao dịch phù hợp"
                          : "Chưa có giao dịch trong khoảng thời gian này"}
                      </p>
                      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">
                        Giao dịch khóa học sẽ hiển thị tại đây khi học viên đặt hàng.
                      </p>
                      {hasFilters ? (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="focus-ring mt-3 inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-primary transition hover:bg-emerald-50 active:bg-emerald-100"
                        >
                          Xóa bộ lọc
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  transactions.map((item) => (
                    <TransactionRow key={`${item.orderId}-${item.courseId}`} item={item} />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && totalElements > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {totalElements.toLocaleString("vi-VN")} giao dịch
              </p>
              {totalPages > 1 ? (
                <nav aria-label="Phân trang giao dịch" className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                    className="focus-ring min-h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="flex min-h-9 items-center px-2 text-sm text-slate-600">
                    Trang {page + 1}/{totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                    className="focus-ring min-h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sau
                  </button>
                </nav>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function TransactionRow({ item }: { item: InstructorRevenueTransaction }) {
  return (
    <tr className="border-t border-slate-200 align-top">
      <td className="px-3 py-3 font-medium text-slate-900">{item.studentName}</td>
      <td className="max-w-[270px] px-3 py-3 text-slate-700">
        <span className="line-clamp-2">{item.courseTitle}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(item.createdAt)}</td>
      <td className="px-3 py-3 text-primary">{getPaymentMethodLabel(item.paymentMethod)}</td>
      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-900">
        {formatVNDAmount(item.amount)}
      </td>
    </tr>
  );
}
