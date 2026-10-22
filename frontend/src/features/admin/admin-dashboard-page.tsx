"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BadgeAlert,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-client";
import { fetchPaymentReviewOrders, type PaymentReviewOrder } from "@/lib/admin-commerce-client";
import { fetchAdminDashboardSummary, type AdminDashboardSummary } from "@/lib/admin-client";
import { formatOrderCode } from "@/lib/commerce-client";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminDashboardPage() {
  const { getAccessToken, user } = useAuth();
  const [timeRange, setTimeRange] = useState<"today" | "7days" | "30days" | "thisYear">("30days");
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<PaymentReviewOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const loadData = useCallback(async () => {
    setLoadingSummary(true);
    setLoadingOrders(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const [summaryRes, ordersRes] = await Promise.allSettled([
        fetchAdminDashboardSummary(token),
        fetchPaymentReviewOrders(token, 0, 5),
      ]);

      if (summaryRes.status === "fulfilled" && summaryRes.value) {
        setSummary(summaryRes.value);
      }
      if (ordersRes.status === "fulfilled" && ordersRes.value) {
        setPendingOrders(Array.isArray(ordersRes.value?.data) ? ordersRes.value.data : []);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingSummary(false);
      setLoadingOrders(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const safePendingOrders = Array.isArray(pendingOrders) ? pendingOrders : [];
  const monthlyStats = summary?.monthlyStats || [];
  const maxRevenue = Math.max(...monthlyStats.map((m) => m.revenue), 1);
  const categoryDistribution = summary?.categoryDistribution || [];
  const topCourses = summary?.topCourses || [];

  return (
    <div className="space-y-8">
      {/* Welcome & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-heading">
            Xin chào, {user?.fullName || "Quản trị viên"}!
          </h2>
          <p className="mt-1 text-sm text-muted">
            Tổng quan số liệu kinh doanh và vận hành hệ thống EduAlto theo dữ liệu cơ sở dữ liệu
            thực.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Range Selector */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            {(
              [
                { id: "today", label: "Hôm nay" },
                { id: "7days", label: "7 ngày" },
                { id: "30days", label: "30 ngày" },
                { id: "thisYear", label: "Năm nay" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTimeRange(item.id)}
                className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  timeRange === item.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-slate-600 hover:text-heading"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Làm mới dữ liệu thực tế"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted ${loadingSummary ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Doanh thu thực tế */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Tổng doanh thu đã nhận
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold tracking-tight text-heading">
              {loadingSummary ? "Đang tải..." : formatMoney(summary?.totalRevenue ?? 0)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="h-4 w-4" />
              <span>Dữ liệu thực</span>
              <span className="text-muted">từ các giao dịch đã đối soát</span>
            </div>
          </div>
        </div>

        {/* Card 2: Đơn chờ đối soát */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Đơn chờ duyệt
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-heading">
                {summary?.pendingOrdersCount ?? safePendingOrders.length}
              </span>
              <span className="text-xs text-muted">đơn thanh toán thủ công</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Link
                href="/admin/payments"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
              >
                <span>Xử lý ngay</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              {(summary?.pendingOrdersCount ?? safePendingOrders.length) > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Khóa học hoạt động */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Khóa học trên sàn
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold tracking-tight text-heading">
              {loadingSummary ? "..." : (summary?.totalCoursesCount ?? 0)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-muted">
              <span className="text-emerald-600 font-semibold">
                {summary?.publishedCoursesCount ?? 0} đang xuất bản
              </span>
              <span>•</span>
              <span>{summary?.draftCoursesCount ?? 0} bản nháp</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tổng thành viên */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Tổng thành viên
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold tracking-tight text-heading">
              {loadingSummary ? "..." : (summary?.totalUsersCount ?? 0)}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <span className="font-semibold text-purple-700">
                {summary?.totalStudentsCount ?? 0} học viên
              </span>
              <span>•</span>
              <span className="font-semibold text-blue-700">
                {summary?.totalInstructorsCount ?? 0} giảng viên
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Revenue Chart & Category Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-heading">Biểu đồ doanh thu 6 tháng qua</h3>
              <p className="mt-0.5 text-xs text-muted">
                Dữ liệu tổng hợp từ các đơn hàng đã thanh toán thực tế trong hệ thống
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Doanh thu
              </span>
            </div>
          </div>

          {/* Visual CSS-based Bar Chart with Live Data */}
          <div className="mt-6 flex h-60 items-end justify-between gap-3 px-2 sm:gap-6">
            {monthlyStats.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                Chưa có dữ liệu doanh thu
              </div>
            ) : (
              monthlyStats.map((item) => {
                const heightPercentage = Math.max(
                  12,
                  Math.round((item.revenue / maxRevenue) * 100),
                );
                return (
                  <div
                    key={item.month}
                    className="group flex flex-1 flex-col items-center gap-2 h-full justify-end"
                  >
                    <div
                      className="relative w-full max-w-[42px] rounded-t-lg transition-all duration-300 group-hover:opacity-90"
                      style={{
                        height: `${heightPercentage}%`,
                        backgroundColor: item.isCurrent
                          ? "#20B486"
                          : item.revenue > 0
                            ? "#10B981"
                            : "#EAF7F3",
                      }}
                    >
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none z-10">
                        {formatMoney(item.revenue)} ({item.ordersCount} đơn)
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${item.isCurrent ? "text-primary font-bold" : "text-muted"}`}
                    >
                      {item.month}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Category Share */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-heading">Phân bổ cấp độ khóa học</h3>
            <p className="mt-0.5 text-xs text-muted">
              Tỷ trọng các cấp độ khóa học hiện có trong cơ sở dữ liệu
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {categoryDistribution.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">Chưa có dữ liệu phân bổ</div>
            ) : (
              categoryDistribution.map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-heading truncate">
                      {cat.name} ({cat.count})
                    </span>
                    <span className="text-slate-600">{cat.percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.color}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Trạng thái sàn học tập:</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Hệ thống đang lưu trữ <strong>{summary?.totalCoursesCount ?? 0} khóa học</strong> với{" "}
              <strong>{summary?.totalStudentsCount ?? 0} học viên</strong> đang theo học.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Actionable Tasks (Pending Payments) & Top Courses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending Payments Queue */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <BadgeAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-bold text-heading">Đơn hàng cần xác nhận ngay</h3>
            </div>
            <Link
              href="/admin/payments"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Xem tất cả ({safePendingOrders.length})
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {loadingOrders ? (
              <div className="py-8 text-center text-xs text-muted">
                Đang tải danh sách đơn hàng...
              </div>
            ) : safePendingOrders.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-heading">Tất cả đã được xử lý</p>
                <p className="text-xs text-muted">Không có đơn chuyển khoản nào đang chờ duyệt.</p>
              </div>
            ) : (
              safePendingOrders.slice(0, 4).map((order) => (
                <div key={order.orderId} className="flex items-center justify-between py-3.5">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-sm font-semibold text-heading truncate">
                      {order.studentName || "Học viên ẩn danh"}
                    </p>
                    <p className="text-xs text-muted">
                      Mã: <span className="font-mono">{formatOrderCode(order.orderId)}</span> •{" "}
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{formatMoney(order.total)}</p>
                    <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Chờ duyệt
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Performing Courses */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-heading">Top khóa học thực tế</h3>
            </div>
            <Link
              href="/admin/courses"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Quản lý khóa học
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {topCourses.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                Chưa có khóa học nào được ghi nhận
              </div>
            ) : (
              topCourses.map((c, index) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-heading">{c.title}</p>
                    <p className="text-xs text-muted">
                      {c.instructorName} • {c.studentsCount} học viên
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-heading">{formatMoney(c.revenue)}</p>
                    <span className="text-[11px] font-semibold text-amber-600">★ {c.rating}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
