"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, CreditCard, Download, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-client";
import { fetchAdminAnalytics, type AdminAnalytics } from "@/lib/admin-client";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AdminAnalyticsPage() {
  const { getAccessToken } = useAuth();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const data = await fetchAdminAnalytics(token);
      setAnalytics(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const paymentMethods = analytics?.paymentMethods || [];

  const handleExportCsv = () => {
    if (paymentMethods.length === 0) return;

    // Generate CSV content from real data
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Mã kênh,Tên phương thức,Số giao dịch,Tỷ trọng (%),Doanh thu (VND)\n" +
      paymentMethods
        .map((p) => `${p.provider},"${p.label}",${p.count},${p.percentage}%,${p.amount}`)
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `edualto-doanh-thu-thuc-te-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const learningKpi = [
    {
      label: "Số bài học hoàn thành",
      value: loading ? "..." : (analytics?.completedLessonsCount?.toLocaleString("vi-VN") ?? "0"),
      note: "tổng lượt học viên hoàn tất",
    },
    {
      label: "Tỷ lệ tiến độ hoàn thành",
      value: loading ? "..." : `${analytics?.courseCompletionRate ?? 0}%`,
      note: "trên tổng số bài học đã ghi danh",
    },
    {
      label: "Tổng lượt ghi danh",
      value: loading ? "..." : `${analytics?.totalEnrollmentsCount ?? 0} lượt`,
      note: "ghi danh các khóa học thực tế",
    },
    {
      label: "Đánh giá trung bình",
      value: loading ? "..." : `${analytics?.averageCourseRating ?? 5.0} ★`,
      note: `trên ${analytics?.totalReviewsCount ?? 0} đánh giá thực`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">
            Báo cáo & Thống kê chuyên sâu
          </h2>
          <p className="mt-1 text-sm text-muted">
            Phân tích số liệu tài chính, hiệu quả kênh thanh toán và chỉ số học tập thực tế trên
            toàn hệ thống EduAlto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAnalytics()}
            className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>

          <Button
            onClick={handleExportCsv}
            disabled={paymentMethods.length === 0}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#159e75] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{downloadSuccess ? "Đã tải CSV!" : "Xuất báo cáo CSV"}</span>
          </Button>
        </div>
      </div>

      {/* 4 Learning KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {learningKpi.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
          >
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              {kpi.label}
            </span>
            <div className="mt-3 text-2xl font-extrabold text-heading">{kpi.value}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-emerald-600">Dữ liệu thực</span>
              <span className="text-muted">• {kpi.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Method Distribution & Growth Highlights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment Channels */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-heading">Kênh thanh toán thực tế</h3>
              <p className="mt-0.5 text-xs text-muted">
                Cơ cấu phương thức người học đã hoàn tất giao dịch
              </p>
            </div>
            <CreditCard className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-6 space-y-5">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted">
                Đang tải số liệu thanh toán...
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                Chưa có giao dịch thanh toán nào được ghi nhận
              </div>
            ) : (
              paymentMethods.map((item) => (
                <div key={item.provider} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-heading">{item.label}</span>
                    <span className="font-bold text-primary">{formatMoney(item.amount)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                    <span>{item.count} đơn thanh toán thành công</span>
                    <span>
                      Chiếm <strong>{item.percentage}%</strong> doanh thu
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Operational Insights */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-heading">Hiệu quả vận hành hệ thống</h3>
                <p className="mt-0.5 text-xs text-muted">Theo dõi chất lượng học tập và hỗ trợ</p>
              </div>
              <Zap className="h-5 w-5 text-amber-500" />
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-heading">Xác nhận chuyển khoản thủ công</h4>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">
                    Hệ thống cung cấp giao diện đối soát tức thì cho Quản trị viên tại mục{" "}
                    <strong>Thanh toán</strong>, cập nhật trạng thái đơn hàng thời gian thực.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-heading">Tỷ lệ đánh giá tích cực</h4>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">
                    Điểm số khóa học trung bình đạt{" "}
                    <strong>{analytics?.averageCourseRating ?? 5.0} / 5.0 ★</strong> từ phản hồi
                    trực tiếp của học viên đã ghi danh.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-muted text-center">
            Dữ liệu được truy vấn trực tiếp từ cơ sở dữ liệu PostgreSQL thực tế của EduAlto.
          </div>
        </div>
      </div>
    </div>
  );
}
