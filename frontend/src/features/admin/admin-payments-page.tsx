"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/app-header";
import { useAuth } from "@/features/auth/auth-client";
import {
  confirmCapturedPayment,
  confirmManualPayment,
  fetchPaymentReviewOrders,
  type PaymentReviewOrder,
} from "@/lib/admin-commerce-client";
import type { PageResult } from "@/lib/api";

const pageSize = 20;

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function paymentMethodLabel(method: string) {
  if (method === "MOMO") return "Chuyển khoản MoMo";
  if (method === "VNPAY") return "Thanh toán VNPay";
  return "Chuyển khoản ngân hàng";
}

export function AdminPaymentsPage() {
  const { getAccessToken, loading: authLoading, user } = useAuth();
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<PageResult<PaymentReviewOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [references, setReferences] = useState<Record<string, string>>({});
  const [busyOrder, setBusyOrder] = useState("");

  const loadOrders = useCallback(async () => {
    if (authLoading || !user?.roles.includes("ADMIN")) return;
    setLoading(true);
    setLoadError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setResult(await fetchPaymentReviewOrders(token, page, pageSize));
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Chưa thể tải danh sách thanh toán.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, getAccessToken, page, user?.roles]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function handleConfirm(orderId: string) {
    const receiptReference = references[orderId]?.trim() ?? "";
    if (!receiptReference) {
      setActionError("Vui lòng nhập mã tham chiếu biên nhận trước khi xác nhận.");
      return;
    }

    setBusyOrder(orderId);
    setActionError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const order = result?.data.find((entry) => entry.orderId === orderId);
      if (order?.paymentStatus === "REVIEW") {
        await confirmCapturedPayment(token, orderId, receiptReference);
        setReferences((current) => {
          const next = { ...current };
          delete next[orderId];
          return next;
        });
        await loadOrders();
        return;
      }
      const confirmedOrder = await confirmManualPayment(token, orderId, receiptReference);
      if (confirmedOrder.status === "PAYMENT_REVIEW") {
        setActionError(
          "Thời hạn giữ chỗ đã hết. Đơn được chuyển sang trạng thái cần xác minh; hãy kiểm tra giao dịch rồi xác nhận lại.",
        );
        await loadOrders();
        return;
      }
      const nextTotal = Math.max(0, (result?.meta.totalElements ?? 1) - 1);
      const nextPageCount = Math.ceil(nextTotal / pageSize);
      if (page > 0 && page >= nextPageCount) setPage(Math.max(0, nextPageCount - 1));
      setResult((current) =>
        current
          ? {
              ...current,
              data: current.data.filter((order) => order.orderId !== orderId),
              meta: { ...current.meta, totalElements: nextTotal, totalPages: nextPageCount },
            }
          : current,
      );
      setReferences((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Chưa thể xác nhận thanh toán.");
    } finally {
      setBusyOrder("");
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div role="status" className="skeleton h-40 rounded-xl" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Cần đăng nhập</h1>
        <p className="mt-2 text-sm text-muted">
          Đăng nhập bằng tài khoản quản trị để đối soát thanh toán.
        </p>
        <Link
          className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
          href="/login"
        >
          Đăng nhập
        </Link>
      </main>
    );
  }

  if (!user.roles.includes("ADMIN")) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <CircleAlert className="mx-auto h-9 w-9 text-amber-600" />
        <h1 className="mt-3 text-2xl font-bold text-ink">Bạn không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-muted">
          Trang đối soát chỉ dành cho quản trị viên EduAlto.
        </p>
        <Link
          className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink transition hover:bg-slate-50 active:bg-slate-100"
          href="/"
        >
          Về trang chủ
        </Link>
      </main>
    );
  }

  const orders = result?.data ?? [];
  const totalPages = result?.meta.totalPages ?? 0;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Quản trị hệ thống</p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Đối soát thanh toán</h1>
            <p className="mt-2 text-sm text-muted">
              Kiểm tra giao dịch chuyển khoản và xác nhận đơn hàng đã thanh toán.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadOrders()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Tải lại
          </Button>
        </header>

        {actionError ? (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          >
            {actionError}
          </div>
        ) : null}
        {loadError ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
          >
            <p>{loadError}</p>
            <button
              type="button"
              className="mt-2 font-semibold underline"
              onClick={() => void loadOrders()}
            >
              Thử lại
            </button>
          </div>
        ) : loading ? (
          <div role="status" className="grid gap-3">
            <div className="skeleton h-36 rounded-xl" />
            <div className="skeleton h-36 rounded-xl" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dceae4] bg-[#fbfefc] px-5 py-14 text-center">
            <Check className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-3 text-lg font-semibold text-ink">Không có giao dịch chờ đối soát</h2>
            <p className="mt-1 text-sm text-muted">
              Các đơn chuyển khoản đang chờ xác nhận sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {orders.map((order) => (
                <article
                  key={order.orderId}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-all text-sm font-bold text-ink">Đơn {order.orderId}</h2>
                      <p className="mt-1 text-xs text-muted">
                        {order.studentName} · {paymentMethodLabel(order.paymentMethod)} ·{" "}
                        {formatDate(order.createdAt)}
                      </p>
                      {order.expiresAt ? (
                        <p className="mt-1 text-xs text-muted">
                          Hạn giữ ưu đãi: {formatDate(order.expiresAt)}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-base font-bold text-ink">
                      {formatMoney(order.total, order.currency)}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 rounded-lg bg-[#f5fbf9] p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                    <p className="break-all text-muted">
                      Nội dung chuyển khoản:{" "}
                      <span className="font-semibold text-ink">{order.transferReference}</span>
                    </p>
                    <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {order.paymentStatus === "REVIEW"
                        ? "Cần xác minh giao dịch trễ"
                        : "Chờ đối soát"}
                    </span>
                  </div>
                  {order.paymentStatus === "REVIEW" ? (
                    <p className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
                      {order.paymentReviewReason === "PROMOTION_RESERVATION_EXPIRED"
                        ? "Ưu đãi đã hết hạn giữ chỗ khi hệ thống nhận được xác nhận thanh toán. Hãy kiểm tra giao dịch thực tế và nhập mã tham chiếu trước khi ghi nhận đã nhận tiền."
                        : "Giao dịch cần được kiểm tra thủ công trước khi ghi nhận đã nhận tiền."}
                    </p>
                  ) : null}
                  <form
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleConfirm(order.orderId);
                    }}
                  >
                    <label className="sr-only" htmlFor={`receipt-${order.orderId}`}>
                      Mã tham chiếu biên nhận cho đơn {order.orderId}
                    </label>
                    <input
                      id={`receipt-${order.orderId}`}
                      className="focus-ring min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm text-ink placeholder:text-slate-400"
                      placeholder="Nhập mã tham chiếu biên nhận"
                      value={references[order.orderId] ?? ""}
                      onChange={(event) =>
                        setReferences((current) => ({
                          ...current,
                          [order.orderId]: event.target.value,
                        }))
                      }
                      maxLength={200}
                      disabled={busyOrder === order.orderId}
                      required
                    />
                    <Button
                      type="submit"
                      loading={busyOrder === order.orderId}
                      disabled={Boolean(busyOrder && busyOrder !== order.orderId)}
                    >
                      <Check className="h-4 w-4" />
                      Xác nhận đã nhận tiền
                    </Button>
                  </form>
                </article>
              ))}
            </div>
            <footer className="mt-5 flex items-center justify-between gap-3 text-sm text-muted">
              <span>{result?.meta.totalElements ?? 0} đơn chờ xác nhận</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0 || loading}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  Trang {page + 1} / {Math.max(totalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page + 1 >= totalPages || loading}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </footer>
          </>
        )}
        {busyOrder ? (
          <p className="sr-only" role="status">
            <LoaderCircle className="inline h-4 w-4 animate-spin" /> Đang xác nhận thanh toán.
          </p>
        ) : null}
      </main>
    </div>
  );
}
