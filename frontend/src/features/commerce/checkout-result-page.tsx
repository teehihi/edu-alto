"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, CircleX, Clock3, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/lib/auth-session";
import { fetchOrderDetails, type OrderDetails } from "@/lib/commerce-client";
import { formatVND } from "@/lib/format";
import { removeCourseFromCart } from "@/lib/cart";

export function CheckoutResultPage() {
  const { user, isLoading: sessionLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("vnp_TxnRef");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      const next = `/checkout/result${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!orderId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const checkOrder = () =>
      void getAccessToken()
        .then((token) => {
          if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          return fetchOrderDetails(token, orderId);
        })
        .then((result) => {
          if (!active) return;
          setOrder(result);
          setError("");
          if (result.status === "PENDING_PAYMENT" || result.status === "PAYMENT_REVIEW") {
            timer = setTimeout(checkOrder, 10_000);
          }
        })
        .catch((reason: unknown) => {
          if (active)
            setError(reason instanceof Error ? reason.message : "Chưa thể kiểm tra đơn hàng.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    checkOrder();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [getAccessToken, orderId, router, sessionLoading, user]);

  const paid = order?.status === "PAID";
  const pending = order?.status === "PENDING_PAYMENT" || order?.status === "PAYMENT_REVIEW";
  useEffect(() => {
    if (order?.status === "PAID") {
      for (const item of order.items) removeCourseFromCart(item.courseId);
    }
  }, [order]);
  return (
    <main className="container-page grid min-h-[65vh] place-items-center py-12">
      <section className="w-full max-w-xl rounded-2xl border border-[#e4ece8] bg-white p-7 text-center shadow-sm md:p-10">
        {!orderId ? (
          <div role="alert">
            <CircleX className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="mt-4 text-xl font-semibold text-[#101a2c]">
              Chưa thể kiểm tra thanh toán
            </h1>
            <p className="mt-2 text-sm text-[#667085]">
              Không tìm thấy mã đơn hàng trong kết quả thanh toán.
            </p>
          </div>
        ) : loading ? (
          <div role="status" className="text-primary">
            <LoaderCircle className="mx-auto h-9 w-9 animate-spin" />
            <p className="mt-3 text-sm text-[#667085]">Đang kiểm tra trạng thái đơn hàng...</p>
          </div>
        ) : error ? (
          <div role="alert">
            <CircleX className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="mt-4 text-xl font-semibold text-[#101a2c]">
              Chưa thể kiểm tra thanh toán
            </h1>
            <p className="mt-2 text-sm text-[#667085]">{error}</p>
          </div>
        ) : (
          <>
            {paid ? (
              <CircleCheck className="mx-auto h-10 w-10 text-primary" />
            ) : pending ? (
              <Clock3 className="mx-auto h-10 w-10 text-amber-500" />
            ) : (
              <CircleX className="mx-auto h-10 w-10 text-rose-500" />
            )}
            <h1 className="mt-4 text-xl font-semibold text-[#101a2c]">
              {paid
                ? "Thanh toán thành công"
                : order?.status === "PAYMENT_REVIEW"
                  ? "Đơn hàng chờ đối soát"
                  : pending
                    ? "Đang xác nhận thanh toán"
                    : "Thanh toán chưa hoàn tất"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              {paid
                ? "Đơn hàng đã được xác nhận. Khóa học đã mở trong khu vực học tập của bạn."
                : pending
                  ? order?.status === "PAYMENT_REVIEW"
                    ? order?.paymentReviewReason === "PROMOTION_RESERVATION_EXPIRED"
                      ? "Giao dịch đến sau thời hạn giữ mã giảm giá và đang được quản trị viên xác minh. Khóa học sẽ mở sau khi xác nhận tiền đã nhận."
                      : "Đơn hàng đang chờ quản trị viên đối soát giao dịch chuyển khoản. Khóa học sẽ mở sau khi giao dịch được xác nhận."
                    : "VNPay đã quay lại EduAlto. Hệ thống đang chờ xác nhận an toàn từ máy chủ thanh toán; trạng thái sẽ tự cập nhật sau ít phút."
                  : "Đơn hàng chưa được thanh toán. Bạn có thể quay lại giỏ hàng và thử lại."}
            </p>
            {order && (
              <div className="mt-5 rounded-lg bg-[#f7fbf9] p-4 text-left text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[#667085]">Mã đơn</span>
                  <span className="font-medium">{order.orderId}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3">
                  <span className="text-[#667085]">Tạm tính</span>
                  <span className="font-medium">{formatVND(order.subtotal)}</span>
                </div>
                {order.discountTotal > 0 ? (
                  <div className="mt-2 flex justify-between gap-3">
                    <span className="text-[#667085]">Ưu đãi</span>
                    <span className="font-medium text-primary">
                      −{formatVND(order.discountTotal)}
                    </span>
                  </div>
                ) : null}
                <div className="mt-2 flex justify-between gap-3">
                  <span className="text-[#667085]">Tổng tiền</span>
                  <span className="font-semibold">{formatVND(order.total)}</span>
                </div>
                <ul className="mt-3 space-y-1 border-t border-[#e5eee9] pt-3 text-xs text-[#52605a]">
                  {order.items.map((item) => (
                    <li key={item.courseId} className="flex justify-between gap-3">
                      <span>
                        {item.title}
                        {item.promotionCode ? (
                          <span className="ml-1 text-primary">({item.promotionCode})</span>
                        ) : null}
                      </span>
                      <span>
                        {item.discountAmount > 0 ? (
                          <>
                            <span className="mr-1 text-slate-400 line-through">
                              {formatVND(item.listPrice)}
                            </span>
                            {formatVND(item.unitPrice)}
                          </>
                        ) : (
                          formatVND(item.unitPrice)
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {pending && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="focus-ring rounded-lg border border-[#dfe9e4] px-4 py-2.5 text-sm font-semibold text-[#52605a] hover:border-primary hover:text-primary"
            >
              Kiểm tra lại
            </button>
          )}
          <Link
            href={paid ? "/learning/courses" : "/cart"}
            className="focus-ring inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
          >
            {paid ? "Vào khóa học" : "Quay lại giỏ hàng"}
          </Link>
        </div>
      </section>
    </main>
  );
}
