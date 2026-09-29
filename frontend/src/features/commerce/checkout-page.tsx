"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCheckoutOrder, type CheckoutOrder, type PaymentMethod } from "@/lib/commerce-client";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { readCart, type CartCourse } from "@/lib/cart";
import { ApiClientError } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { useAuthSession } from "@/lib/auth-session";

export function CheckoutPage() {
  const { user, getAccessToken } = useAuthSession();
  const router = useRouter();
  const [courses, setCourses] = useState<CartCourse[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MOMO");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CheckoutOrder | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setCourses(readCart()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const subtotal = courses.reduce((sum, course) => sum + course.price, 0);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-gradient-to-b from-[#e5f8f2] to-white">
        <AppHeader />
      </div>
      <main className="mx-auto w-full max-w-[1440px] min-h-[610px] flex-1 px-5 py-8 sm:px-6 lg:px-20 md:py-10">
        <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-2 text-sm text-[#7f8a86]">
          <Link href="/courses" className="focus-ring rounded hover:text-primary">
            Chi tiết khóa học
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/cart" className="focus-ring rounded hover:text-primary">
            Giỏ hàng
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-primary" aria-current="page">
            Thanh toán
          </span>
        </nav>
        <h1 className="text-3xl font-semibold text-primary md:text-[32px]">Thanh toán</h1>
        {courses.length ? (
          <div className="mt-6 grid items-start gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
            <form
              id="checkout-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!user) {
                  router.push(`/login?next=${encodeURIComponent("/checkout")}`);
                  return;
                }
                setSubmitting(true);
                setMessage("");
                try {
                  const token = await getAccessToken();
                  if (!token)
                    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                  const order = await createCheckoutOrder(
                    token,
                    courses.map((course) => course.id),
                    paymentMethod,
                  );
                  if (order.paymentMethod === "VNPAY") {
                    if (!order.paymentUrl)
                      throw new Error("Cổng VNPay chưa trả về liên kết thanh toán.");
                    window.location.assign(order.paymentUrl);
                    return;
                  }
                  setCreatedOrder(order);
                  setSubmitting(false);
                } catch (reason) {
                  setMessage(
                    reason instanceof ApiClientError &&
                      reason.code === "PAYMENT_GATEWAY_NOT_CONFIGURED"
                      ? "VNPay Sandbox chưa được cấu hình trên máy chủ. Giỏ hàng vẫn được giữ nguyên."
                      : reason instanceof Error
                        ? reason.message
                        : "Chưa thể tạo đơn hàng. Vui lòng thử lại.",
                  );
                  setSubmitting(false);
                }
              }}
              className="rounded-2xl border border-[#e2eaf0] p-4 md:min-h-[570px] md:p-6"
            >
              <fieldset>
                <legend className="text-xs font-semibold text-primary">
                  Phương thức thanh toán
                </legend>
                <div className="mt-3 space-y-2">
                  {(
                    [
                      ["VNPAY", "VNPay Sandbox", "Thanh toán trực tuyến"],
                      ["MOMO", "MoMo", "Chuyển khoản đến ví cá nhân"],
                      ["VIETQR", "VietQR · Vietcombank", "Quét QR chuyển khoản"],
                    ] as const
                  ).map(([method, label, detail]) => (
                    <label
                      key={method}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition ${
                        paymentMethod === method
                          ? "border-[#b7e4d7] bg-[#f2fbf7]"
                          : "border-transparent bg-[#f6f8fa] hover:bg-[#eff8f5]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => {
                          setPaymentMethod(method);
                          setCreatedOrder(null);
                          setMessage("");
                        }}
                        className="h-4 w-4 accent-[#20b486]"
                      />
                      <span className="min-w-0 flex-1 text-xs font-semibold text-[#101a2c]">
                        {label}
                      </span>
                      <span className="text-right text-[11px] text-[#74817b]">{detail}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#f5faf8] p-3 text-xs leading-5 text-[#75817c]">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {paymentMethod === "VNPAY"
                  ? "Bạn sẽ được chuyển đến VNPay Sandbox. Khóa học chỉ mở sau khi hệ thống xác nhận IPN có chữ ký hợp lệ."
                  : "Đơn chuyển khoản sẽ chờ quản trị viên đối soát. Không gửi mật khẩu, mã OTP hoặc thông tin đăng nhập ngân hàng."}
              </div>
              {createdOrder?.instructions && (
                <ManualPaymentInstructions
                  order={createdOrder}
                  method={paymentMethod}
                  copied={copied}
                  onCopy={() => {
                    void navigator.clipboard
                      .writeText(createdOrder.instructions!.transferReference)
                      .then(() => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1800);
                      });
                  }}
                />
              )}
              {message && (
                <p
                  role="status"
                  className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                >
                  {message}
                </p>
              )}
            </form>
            <aside className="rounded-2xl border border-[#e2eaf0] p-4">
              <h2 className="text-sm font-semibold text-[#101a2c]">Chi tiết đơn hàng</h2>
              <div className="mt-4 space-y-3">
                {courses.map((course) => (
                  <article
                    key={course.id}
                    className="flex gap-3 rounded-lg border border-[#e7edeb] bg-[#f8fafc] p-2.5"
                  >
                    <Link
                      href={`/courses/${course.slug}`}
                      className="focus-ring relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-md bg-[#eaf8f3]"
                    >
                      {course.thumbnailUrl ? (
                        <Image
                          src={course.thumbnailUrl}
                          alt={course.title}
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-primary">
                          <CreditCard className="h-5 w-5" />
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-semibold text-primary">
                        {course.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[11px] text-[#7c8783]">
                        {course.instructorName}
                      </p>
                      <p className="mt-1 text-xs font-semibold">{formatVND(course.price)}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-3 space-y-3 rounded-lg border border-[#e5ece9] bg-[#f8fbfa] p-3 text-xs">
                <SummaryRow label="Tạm tính" value={formatVND(subtotal)} />
                <SummaryRow label="Giảm giá" value="Chưa áp dụng" />
                <SummaryRow label="Thuế/Phí" value="Chưa tính" />
                <div className="border-t border-[#e5ece9] pt-3">
                  <SummaryRow label="Tổng tạm tính" value={formatVND(subtotal)} strong />
                </div>
              </div>
              <button
                form="checkout-form"
                disabled={submitting || Boolean(createdOrder)}
                className="focus-ring mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#079b70] text-sm font-semibold text-white transition hover:bg-[#078561] disabled:cursor-wait disabled:opacity-60"
              >
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {submitting
                  ? "Đang tạo đơn hàng..."
                  : createdOrder
                    ? "Đơn hàng đã được tạo"
                    : paymentMethod === "VNPAY"
                      ? "Thanh toán qua VNPay Sandbox"
                      : "Tạo hướng dẫn chuyển khoản"}
              </button>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-5 text-[#84908b]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                {paymentMethod === "VNPAY" ? "Thanh toán VNPay Sandbox" : "Chuyển khoản thủ công"}
              </p>
            </aside>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-[#e5ede9] bg-[#fbfefc] px-5 py-10 text-center">
            <p className="text-sm text-[#75817c]">Giỏ hàng của bạn đang trống.</p>
            <Link
              href="/courses"
              className="focus-ring mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
            >
              Quay lại danh mục
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ManualPaymentInstructions({
  order,
  method,
  copied,
  onCopy,
}: {
  order: CheckoutOrder;
  method: PaymentMethod;
  copied: boolean;
  onCopy: () => void;
}) {
  const details = order.instructions;
  if (!details) return null;

  return (
    <section className="mt-4 rounded-xl border border-[#cfe9df] bg-[#f5fbf8] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e1f7ee] text-primary">
          <Check className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[#101a2c]">Đơn hàng đang chờ đối soát</h2>
          <p className="mt-1 text-xs leading-5 text-[#667085]">
            Chuyển đúng số tiền và nhập mã đơn hàng ở nội dung. Khóa học sẽ mở sau khi quản trị viên
            xác nhận giao dịch.
          </p>
        </div>
      </div>
      {details.qrUrl && (
        <Image
          src={details.qrUrl}
          alt="Mã VietQR để chuyển khoản"
          width={240}
          height={240}
          unoptimized
          className="mx-auto mt-4 rounded-lg border border-[#e5ece9] bg-white p-2"
        />
      )}
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <PaymentDetail
          label="Ngân hàng / ví"
          value={details.bankName ?? (details.walletPhone ? "MoMo" : "")}
        />
        <PaymentDetail label="Người nhận" value={details.recipientName} />
        <PaymentDetail
          label={method === "MOMO" ? "Số điện thoại MoMo" : "Số tài khoản"}
          value={details.walletPhone ?? details.accountNumber ?? ""}
        />
        <PaymentDetail label="Số tiền" value={formatVND(details.amount)} />
        <PaymentDetail label="Nội dung chuyển khoản" value={details.transferReference} />
        <PaymentDetail label="Mã đơn hàng" value={order.orderId} />
      </dl>
      <button
        type="button"
        onClick={onCopy}
        className="focus-ring mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-[#dce8e2] bg-white px-3 text-xs font-semibold text-[#52605a] hover:border-primary hover:text-primary"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Đã sao chép nội dung" : "Sao chép nội dung chuyển khoản"}
      </button>
      <Link
        href={`/checkout/result?vnp_TxnRef=${encodeURIComponent(order.orderId)}`}
        className="focus-ring ml-3 inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-primary hover:bg-[#eaf8f3]"
      >
        Xem trạng thái đơn hàng
      </Link>
    </section>
  );
}

function PaymentDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-white px-2.5 py-2">
      <dt className="text-[10px] text-[#87928d]">{label}</dt>
      <dd className="mt-0.5 break-all font-semibold text-[#34413c]">{value}</dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${strong ? "pt-1 text-sm font-semibold text-primary" : "text-[#34413c]"}`}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
