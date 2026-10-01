"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  CircleAlert,
  CircleDollarSign,
  CircleHelp,
  CirclePlus,
  ChartNoAxesCombined,
  Filter,
  LoaderCircle,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ApiClientError } from "@/lib/api";
import {
  createCoursePromotion,
  fetchCoursePromotionSummary,
  fetchCoursePromotions,
  updateCoursePromotion,
  type InstructorPromotion,
  type InstructorPromotionInput,
  type InstructorPromotionSummary,
  type PromotionDiscountType,
  type PromotionStatus,
} from "@/lib/instructor-promotion-client";
import { useInstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

type PromotionDraft = {
  name: string;
  code: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  maxRedemptions: string;
  startsAt: string;
  endsAt: string;
};

const emptyDraft: PromotionDraft = {
  name: "",
  code: "",
  discountType: "PERCENT",
  discountValue: "",
  maxRedemptions: "",
  startsAt: "",
  endsAt: "",
};

const statusLabels: Record<PromotionStatus | "all", string> = {
  all: "Tất cả trạng thái",
  SCHEDULED: "Sắp diễn ra",
  ACTIVE: "Đang hoạt động",
  DISABLED: "Đã tắt",
  EXPIRED: "Đã kết thúc",
  EXHAUSTED: "Đã hết lượt",
};

const statusStyles: Record<PromotionStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DISABLED: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-slate-100 text-slate-600",
  EXHAUSTED: "bg-amber-50 text-amber-700",
};

function formatAmount(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function toLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toPayload(draft: PromotionDraft): InstructorPromotionInput {
  return {
    name: draft.name.trim(),
    code: draft.code.trim().toUpperCase(),
    discountType: draft.discountType,
    discountValue: Number(draft.discountValue),
    maxRedemptions: draft.maxRedemptions.trim() ? Number(draft.maxRedemptions) : null,
    startsAt: new Date(draft.startsAt).toISOString(),
    endsAt: new Date(draft.endsAt).toISOString(),
  };
}

function fromPromotion(promotion: InstructorPromotion): PromotionDraft {
  return {
    name: promotion.name,
    code: promotion.code,
    discountType: promotion.discountType,
    discountValue: String(promotion.discountValue),
    maxRedemptions: promotion.maxRedemptions === null ? "" : String(promotion.maxRedemptions),
    startsAt: toLocalInputValue(promotion.startsAt),
    endsAt: toLocalInputValue(promotion.endsAt),
  };
}

function PromotionRedemptionChart({ summary }: { summary: InstructorPromotionSummary }) {
  const periods = summary.periods ?? [];
  const maximum = Math.max(...periods.map((period) => period.redeemedAmount), 0);
  return (
    <section
      aria-labelledby="promotion-chart-heading"
      className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="promotion-chart-heading" className="font-semibold text-slate-900">
            Giá trị ưu đãi đã dùng
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            12 tháng gần nhất, chỉ tính đơn đã thanh toán.
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          Giá trị giảm
        </span>
      </div>
      {periods.length === 0 || maximum === 0 ? (
        <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
          <ChartNoAxesCombined className="h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-2 text-sm text-slate-600">
            Chưa có lượt đổi thành công trong 12 tháng gần nhất.
          </p>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Giá trị giảm đã dùng trong 12 tháng gần nhất: ${formatAmount(summary.redeemedAmount)}`}
          className="mt-4 flex h-[160px] items-end gap-2 overflow-x-auto"
        >
          {periods.map((period) => {
            const height =
              period.redeemedAmount > 0 ? Math.max(4, (period.redeemedAmount / maximum) * 112) : 0;
            return (
              <div key={period.label} className="flex h-full min-w-7 flex-1 flex-col justify-end">
                <div
                  title={`${period.label}: ${formatAmount(period.redeemedAmount)} · ${period.redeemedCount} lượt`}
                  className="mx-auto w-full max-w-8 rounded-t bg-primary/80 transition hover:bg-primary"
                  style={{ height: `${height}px` }}
                />
                <span className="mt-2 truncate text-center text-[10px] text-slate-500">
                  {period.label.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function InstructorCoursePromotionsPage() {
  const { accessToken, course } = useInstructorCourseWorkspace();
  const [promotions, setPromotions] = useState<InstructorPromotion[]>([]);
  const [summary, setSummary] = useState<InstructorPromotionSummary | null>(null);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PromotionStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InstructorPromotion | null>(null);
  const [draft, setDraft] = useState<PromotionDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPromotions = useCallback(async () => {
    if (!accessToken) {
      setError("Vui lòng đăng nhập để quản lý mã khuyến mãi.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [result, nextSummary] = await Promise.all([
        fetchCoursePromotions(course.id, accessToken, page, search, status),
        fetchCoursePromotionSummary(course.id, accessToken),
      ]);
      setPromotions(result.data);
      setTotalElements(result.meta.totalElements);
      setTotalPages(result.meta.totalPages);
      setSummary(nextSummary);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể tải mã khuyến mãi. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, course.id, page, search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadPromotions(), search ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadPromotions, search]);

  const updateDraft = <K extends keyof PromotionDraft>(field: K, value: PromotionDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError(null);
  };

  const openCreateForm = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (promotion: InstructorPromotion) => {
    setEditing(promotion);
    setDraft(fromPromotion(promotion));
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setDraft(emptyDraft);
    setFormError(null);
  };

  const submitPromotion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) {
      setFormError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }
    const discountValue = Number(draft.discountValue);
    const maxRedemptions = draft.maxRedemptions.trim() ? Number(draft.maxRedemptions) : null;
    if (!draft.startsAt || !draft.endsAt || new Date(draft.endsAt) <= new Date(draft.startsAt)) {
      setFormError("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }
    if (!Number.isInteger(discountValue) || discountValue <= 0) {
      setFormError("Mức giảm phải là số nguyên lớn hơn 0.");
      return;
    }
    if (draft.discountType === "PERCENT" && discountValue > 100) {
      setFormError("Mức giảm theo phần trăm không được vượt quá 100%.");
      return;
    }
    if (draft.discountType === "FIXED" && discountValue > course.price) {
      setFormError("Mức giảm cố định không được vượt quá giá khóa học.");
      return;
    }
    if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
      setFormError("Số lượt sử dụng phải là số nguyên lớn hơn 0 hoặc để trống nếu không giới hạn.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = toPayload(draft);
      if (editing) await updateCoursePromotion(editing.id, payload, accessToken);
      else await createCoursePromotion(course.id, payload, accessToken);
      setFormOpen(false);
      setEditing(null);
      setDraft(emptyDraft);
      await loadPromotions();
    } catch (cause) {
      setFormError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể lưu mã khuyến mãi. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion: InstructorPromotion) => {
    if (!accessToken) return;
    const shouldDisable = promotion.status !== "DISABLED";
    try {
      const payload = {
        name: promotion.name,
        code: promotion.code,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        maxRedemptions: promotion.maxRedemptions,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
        status: shouldDisable ? ("DISABLED" as const) : ("ACTIVE" as const),
      };
      await updateCoursePromotion(promotion.id, payload, accessToken);
      await loadPromotions();
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể cập nhật trạng thái mã. Vui lòng thử lại.",
      );
    }
  };

  const stats = [
    { label: "Tổng số mã giảm giá", value: summary?.totalPromotionCount, icon: CirclePlus },
    { label: "Lượt đổi thành công", value: summary?.redeemedCount, icon: CircleHelp },
    { label: "Giá trị đã giảm", value: summary?.redeemedAmount, icon: CircleDollarSign },
  ];
  const immutableTerms = Boolean(editing && editing.redeemedCount > 0);

  return (
    <div className="min-w-0 space-y-5 text-slate-900">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary sm:text-2xl">Mã khuyến mãi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý ưu đãi cho khóa học “{course.title}”.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary/90 active:bg-primary/80 sm:self-auto"
        >
          <CirclePlus className="h-4 w-4" aria-hidden="true" /> Tạo mã giảm giá
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
            onClick={() => void loadPromotions()}
            className="focus-ring rounded px-2 py-1 font-semibold hover:bg-rose-50"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {summary ? <PromotionRedemptionChart summary={summary} /> : null}

      <section aria-label="Thống kê khuyến mãi" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="flex min-h-20 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[0_0_4px_rgba(59,130,246,0.12)]"
          >
            <div>
              <p className="text-2xl font-semibold text-primary" aria-live="polite">
                {loading && value === undefined
                  ? "…"
                  : value === undefined
                    ? "—"
                    : label === "Giá trị đã giảm"
                      ? formatAmount(value)
                      : value.toLocaleString("vi-VN")}
              </p>
              <p className="mt-1 text-sm text-slate-700">{label}</p>
            </div>
            <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          </article>
        ))}
      </section>

      <section aria-labelledby="promotion-list-heading" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="promotion-list-heading" className="font-semibold text-slate-900">
              Danh sách ưu đãi
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {totalElements.toLocaleString("vi-VN")} mã
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:w-64">
              <span className="sr-only">Tìm tên hoặc mã khuyến mãi</span>
              <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Tìm tên hoặc mã…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="relative flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <span className="sr-only">Lọc trạng thái khuyến mãi</span>
              <Filter className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as PromotionStatus | "all");
                  setPage(0);
                }}
                className="focus-ring max-w-44 appearance-none bg-transparent pr-1"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Tên ưu đãi
                </th>
                <th scope="col" className="px-4 py-3">
                  Mã
                </th>
                <th scope="col" className="px-4 py-3">
                  Mức giảm
                </th>
                <th scope="col" className="px-4 py-3">
                  Trạng thái
                </th>
                <th scope="col" className="px-4 py-3">
                  Số lượng
                </th>
                <th scope="col" className="px-4 py-3">
                  Lượt sử dụng
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border-t border-slate-100 px-4 py-12 text-center text-slate-600"
                  >
                    <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
                    Đang tải mã khuyến mãi…
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border-t border-slate-100 px-4 py-12 text-center">
                    <CircleHelp className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                    <p className="mt-3 font-medium text-slate-700">
                      {search || status !== "all"
                        ? "Không tìm thấy mã phù hợp"
                        : "Chưa có mã khuyến mãi"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Tạo mã để áp dụng ưu đãi cho khóa học này khi thanh toán.
                    </p>
                  </td>
                </tr>
              ) : (
                promotions.map((promotion) => (
                  <tr key={promotion.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {promotion.name}
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        {formatDateTime(promotion.startsAt)} – {formatDateTime(promotion.endsAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-2 py-1 font-semibold text-slate-800">
                        {promotion.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {promotion.discountType === "PERCENT"
                        ? `${promotion.discountValue}%`
                        : formatAmount(promotion.discountValue)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[promotion.status]}`}
                      >
                        {statusLabels[promotion.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {promotion.maxRedemptions?.toLocaleString("vi-VN") ?? "Không giới hạn"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {promotion.redeemedCount.toLocaleString("vi-VN")}
                      {promotion.maxRedemptions === null
                        ? ""
                        : ` / ${promotion.maxRedemptions.toLocaleString("vi-VN")}`}
                      <p className="mt-1 text-xs text-slate-500">
                        Đã giảm {formatAmount(promotion.redeemedAmount)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(promotion)}
                          aria-label={`Chỉnh sửa ${promotion.name}`}
                          className="focus-ring inline-flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {promotion.status === "ACTIVE" ||
                        promotion.status === "SCHEDULED" ||
                        promotion.status === "DISABLED" ? (
                          <button
                            type="button"
                            onClick={() => void togglePromotion(promotion)}
                            className="focus-ring min-h-9 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            {promotion.status === "DISABLED" ? "Bật" : "Tắt"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 ? (
          <nav
            aria-label="Phân trang mã khuyến mãi"
            className="flex items-center justify-between gap-3"
          >
            <p className="text-sm text-slate-600">
              Trang {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                className="focus-ring min-h-9 rounded-md border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
                className="focus-ring min-h-9 rounded-md border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </nav>
        ) : null}
      </section>

      {formOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-promotion-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 id="create-promotion-title" className="text-lg font-semibold text-slate-900">
                  {editing ? "Chỉnh sửa mã giảm giá" : "Tạo mã giảm giá"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Áp dụng cho khóa học “{course.title}”.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Đóng biểu mẫu"
                disabled={saving}
                className="focus-ring rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <form
              onSubmit={(event) => void submitPromotion(event)}
              className="space-y-4 p-5 sm:p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-800 sm:col-span-2">
                  Tên ưu đãi
                  <input
                    required
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    maxLength={120}
                    placeholder="Ví dụ: Ưu đãi khai giảng"
                    className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
                  />
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Mã giảm giá
                  <input
                    required
                    disabled={immutableTerms}
                    value={draft.code}
                    onChange={(event) =>
                      updateDraft("code", event.target.value.toUpperCase().replace(/\s/g, ""))
                    }
                    minLength={3}
                    maxLength={32}
                    pattern="[A-Z0-9_-]+"
                    placeholder="NHAPMA"
                    className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 font-normal uppercase disabled:bg-slate-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Loại giảm giá
                  <select
                    disabled={immutableTerms}
                    value={draft.discountType}
                    onChange={(event) =>
                      updateDraft("discountType", event.target.value as PromotionDiscountType)
                    }
                    className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal disabled:bg-slate-100"
                  >
                    <option value="PERCENT">Phần trăm</option>
                    <option value="FIXED">Số tiền cố định</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Mức giảm
                  <input
                    required
                    disabled={immutableTerms}
                    type="number"
                    min="1"
                    max={draft.discountType === "PERCENT" ? 100 : course.price}
                    step="1"
                    value={draft.discountValue}
                    onChange={(event) => updateDraft("discountValue", event.target.value)}
                    placeholder={draft.discountType === "PERCENT" ? "10" : "50000"}
                    className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 font-normal disabled:bg-slate-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-800">
                  Số lượt sử dụng
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={draft.maxRedemptions}
                    onChange={(event) => updateDraft("maxRedemptions", event.target.value)}
                    placeholder="Không giới hạn"
                    className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Để trống nếu không giới hạn.
                  </span>
                </label>
                <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                  <legend className="mb-1 text-sm font-semibold text-slate-900">
                    Thời gian áp dụng
                  </legend>
                  <DateTimePicker
                    label="Ngày bắt đầu"
                    value={draft.startsAt}
                    onChange={(value) => updateDraft("startsAt", value)}
                  />
                  <DateTimePicker
                    label="Ngày kết thúc"
                    value={draft.endsAt}
                    onChange={(value) => updateDraft("endsAt", value)}
                  />
                </fieldset>
              </div>
              {immutableTerms ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-5 text-amber-900">
                  Mã và mức giảm đã được giữ cho đơn hàng. Chỉ có thể chỉnh tên, số lượt và thời
                  gian áp dụng.
                </p>
              ) : null}
              {formError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"
                >
                  {formError}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="focus-ring min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 active:bg-primary/80 disabled:cursor-wait disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo mã giảm giá"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
