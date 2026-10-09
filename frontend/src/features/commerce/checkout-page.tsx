"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Download,
  LoaderCircle,
  LockKeyhole,
  Percent,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCheckoutOrder,
  formatOrderCode,
  type CheckoutOrder,
  type PaymentMethod,
} from "@/lib/commerce-client";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { readCart, type CartCourse } from "@/lib/cart";
import { ApiClientError } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import { InstructorPurchaseNotice } from "@/features/commerce/instructor-purchase-notice";

function submitPaymentForm(action: string, fields: { name: string; value: string }[]) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.hidden = true;

  for (const { name, value } of fields) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }

  document.body.append(form);
  form.submit();
}

export function CheckoutPage() {
  const { user, isLoading: authLoading, getAccessToken } = useAuthSession();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [courses, setCourses] = useState<CartCourse[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MOMO");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CheckoutOrder | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setCourses(readCart());
    const sync = () => setCourses(readCart());
    window.addEventListener("edualto:cart-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("edualto:cart-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (createdOrder) {
      const el = document.getElementById("manual-payment-instructions");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [createdOrder]);
  const subtotal = courses.reduce((sum, course) => sum + course.price, 0);
  const isInstructor =
    user?.roles.some((role) => role === "INSTRUCTOR" || role === "ROLE_INSTRUCTOR") ?? false;

  if (!authLoading && isInstructor) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f8fafc]">
        <AppHeader transparent height="checkout" />
        <main className="grid min-h-[610px] flex-1 place-items-center px-5 py-8">
          <InstructorPurchaseNotice />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="flex min-h-screen flex-col bg-[#f8fafc]">
      <div className="relative flex flex-1 flex-col">
        <AppHeader transparent height="checkout" />
        <main className="relative mx-auto min-h-[610px] w-full max-w-[1440px] flex-1 px-5 py-8 sm:px-6 md:py-10 lg:px-20">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#101a2c] sm:text-3xl">
              Thanh toán
            </h1>
            <nav aria-label="Đường dẫn" className="flex items-center gap-2 text-sm text-slate-500">
              <Link href="/courses" className="focus-ring rounded transition hover:text-primary">
                Chi tiết
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href="/cart" className="focus-ring rounded transition hover:text-primary">
                Giỏ hàng
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-primary" aria-current="page">
                Thanh toán đơn hàng
              </span>
            </nav>
          </div>
          {!isMounted || authLoading ? (
            <div className="mt-6 grid items-start gap-8 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs animate-pulse space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-12 rounded-xl bg-slate-100" />
                  <div className="h-12 rounded-xl bg-slate-100" />
                </div>
                <div className="h-12 rounded-xl bg-slate-100" />
                <div className="h-36 rounded-xl bg-slate-100" />
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs animate-pulse space-y-5">
                <div className="h-6 w-36 rounded bg-slate-200" />
                <div className="h-28 rounded-xl bg-slate-100" />
                <div className="h-24 rounded-xl bg-slate-100" />
                <div className="h-12 rounded-xl bg-slate-200" />
              </div>
            </div>
          ) : courses.length ? (
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
                      phoneNumber,
                      promotionCode,
                    );
                    if (order.paymentForm) {
                      submitPaymentForm(order.paymentForm.action, order.paymentForm.fields);
                      return;
                    }
                    if (order.paymentUrl) {
                      window.location.assign(order.paymentUrl);
                      return;
                    }
                    setCreatedOrder(order);
                    setSubmitting(false);
                  } catch (reason) {
                    setMessage(
                      reason instanceof ApiClientError &&
                        reason.code === "PAYMENT_GATEWAY_NOT_CONFIGURED"
                        ? "Cổng thanh toán này chưa được cấu hình trên máy chủ. Giỏ hàng vẫn được giữ nguyên."
                        : reason instanceof Error
                          ? reason.message
                          : "Chưa thể tạo đơn hàng. Vui lòng thử lại.",
                    );
                    setSubmitting(false);
                  }
                }}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Họ và tên
                    <input
                      type="text"
                      value={user?.fullName ?? ""}
                      readOnly
                      placeholder="Tên tài khoản"
                      className="h-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 cursor-not-allowed"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Số điện thoại
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={phoneNumber}
                      onChange={(event) =>
                        setPhoneNumber(event.target.value.replace(/[^0-9]/g, "").slice(0, 10))
                      }
                      required
                      pattern="0[0-9]{9}"
                      title="Nhập số điện thoại gồm 10 chữ số và bắt đầu bằng 0"
                      placeholder="Nhập số điện thoại"
                      autoComplete="tel"
                      className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 transition"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Mã giảm giá
                  <input
                    type="text"
                    value={promotionCode}
                    onChange={(event) => setPromotionCode(event.target.value.toUpperCase())}
                    disabled={submitting || Boolean(createdOrder)}
                    maxLength={32}
                    autoComplete="off"
                    placeholder="Nhập mã ưu đãi (nếu có)"
                    className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium uppercase text-slate-800 outline-none placeholder:normal-case placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50 transition"
                  />
                  <span className="text-xs font-normal text-slate-500">
                    Mã sẽ được kiểm tra theo khóa học trong giỏ hàng khi bạn tạo đơn.
                  </span>
                </label>
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700">
                    Phương thức thanh toán
                  </legend>
                  <div className="mt-3 space-y-2.5">
                    {(
                      [
                        ["VNPAY", "VNPay", "Cổng thanh toán trực tuyến ATM / QR", "Sandbox"],
                        ["MOMO", "MoMo", "Ví điện tử MoMo cá nhân hoặc cổng đối tác", "Ví điện tử"],
                        [
                          "SEPAY",
                          "SePay · Quét mã QR",
                          "Tự động kích hoạt sau chuyển khoản qua ngân hàng",
                          "Tự động 24/7",
                        ],
                        ["STRIPE", "Stripe", "Thẻ quốc tế Visa, MasterCard, JCB", "Quốc tế"],
                        [
                          "VIETQR",
                          "VietQR · Chuyển khoản ngân hàng",
                          "Chuyển khoản thủ công chờ đối soát",
                          "Thủ công",
                        ],
                      ] as const
                    ).map(([method, label, detail, badge]) => (
                      <label
                        key={method}
                        className={cn(
                          "flex min-h-16 cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition",
                          paymentMethod === method
                            ? "border-primary bg-primary/5 text-slate-900 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700",
                        )}
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
                          className="h-5 w-5 shrink-0 appearance-none rounded-full border-2 border-slate-300 bg-white transition-colors checked:border-primary checked:bg-[radial-gradient(circle,#20b486_0_45%,white_48%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-heading">{label}</span>
                            <span className="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full bg-slate-100 px-2 text-[11px] font-medium leading-none text-slate-600">
                              {badge}
                            </span>
                          </div>
                          <span className="text-xs text-muted">{detail}</span>
                        </div>
                        <div className="relative h-7 w-24 shrink-0">
                          {method === "VNPAY" ? (
                            <Image
                              src="/images/payment/vnpay-logo.svg"
                              alt="VNPay"
                              fill
                              sizes="96px"
                              className="object-contain object-right"
                            />
                          ) : method === "MOMO" ? (
                            <Image
                              src="/images/payment/momo-logo.png"
                              alt="MoMo"
                              fill
                              sizes="96px"
                              className="object-contain object-right"
                            />
                          ) : method === "SEPAY" ? (
                            <Image
                              src="/images/payment/sepay-logo.svg"
                              alt="SePay"
                              fill
                              sizes="96px"
                              className="object-contain object-right"
                            />
                          ) : method === "STRIPE" ? (
                            <Image
                              src="/images/payment/Stripe%20wordmark%20-%20Blurple.svg"
                              alt="Stripe"
                              fill
                              sizes="96px"
                              className="object-contain object-right"
                            />
                          ) : (
                            <Image
                              src="/images/payment/VietQR_Logo.svg"
                              alt="VietQR"
                              fill
                              sizes="96px"
                              className="object-contain object-right"
                            />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs leading-5 text-slate-600">
                  <LockKeyhole className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {paymentMethod === "VNPAY" || paymentMethod === "STRIPE"
                      ? "Bạn sẽ được chuyển đến cổng thanh toán an toàn. Khóa học sẽ tự động mở sau khi hoàn tất giao dịch."
                      : paymentMethod === "SEPAY"
                        ? "Hệ thống SePay tự động xác nhận giao dịch và kích hoạt khóa học trong vài giây ngay sau khi nhận tiền."
                        : paymentMethod === "MOMO"
                          ? "Thanh toán tiện lợi qua cổng ví MoMo hoặc chuyển khoản đến ví cá nhân."
                          : "Đơn chuyển khoản thủ công sẽ chờ quản trị viên đối soát trước khi mở khóa học."}
                  </span>
                </div>
                {createdOrder?.instructions && (
                  <ManualPaymentInstructions order={createdOrder} method={paymentMethod} />
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
              <aside className="sticky top-24 space-y-5 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
                <h2 className="text-lg font-bold text-[#101a2c]">Chi tiết đơn hàng</h2>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                  <article className="flex gap-3.5">
                    <Link
                      href={`/courses/${courses[0].slug}`}
                      className="focus-ring relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:h-24 sm:w-24"
                    >
                      {courses[0].thumbnailUrl ? (
                        <Image
                          src={courses[0].thumbnailUrl}
                          alt={courses[0].title}
                          fill
                          unoptimized
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid h-full place-items-center text-primary">
                          <BookOpen className="h-6 w-6" aria-hidden="true" />
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1 self-center">
                      <p className="line-clamp-2 text-sm font-semibold text-[#101a2c] hover:text-primary transition-colors">
                        {courses[0].title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {courses[0].lessonCount && courses[0].durationSeconds
                          ? `${formatDuration(courses[0].durationSeconds)} · ${courses[0].lessonCount} bài học`
                          : courses[0].instructorName}
                      </p>
                      {courses[0].lessonCount && courses[0].durationSeconds ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {courses[0].instructorName}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-sm font-bold text-primary">
                        {formatVND(courses[0].price)}
                      </p>
                    </div>
                  </article>
                  {courses.length > 1 ? (
                    <p className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-600">
                      <Percent className="h-3.5 w-3.5 text-primary" aria-hidden="true" />+
                      {courses.length - 1} khóa học khác trong đơn
                    </p>
                  ) : null}
                </div>
                <div className="space-y-3 border-t border-slate-200/80 pt-4 text-sm">
                  <SummaryRow
                    label="Tạm tính"
                    value={formatVND(createdOrder?.subtotal ?? subtotal)}
                  />
                  <SummaryRow
                    label="Giảm giá"
                    value={
                      createdOrder
                        ? createdOrder.discountTotal > 0
                          ? `−${formatVND(createdOrder.discountTotal)}`
                          : "Không áp dụng"
                        : promotionCode.trim()
                          ? "Sẽ kiểm tra khi tạo đơn"
                          : "Chưa áp dụng"
                    }
                  />
                  <SummaryRow label="Thuế / Phí" value="Đã bao gồm" />
                  <div className="border-t border-dashed border-slate-200 pt-3">
                    <SummaryRow
                      label="Tổng thanh toán"
                      value={formatVND(createdOrder?.total ?? subtotal)}
                      strong
                    />
                  </div>
                </div>
                <button
                  form="checkout-form"
                  disabled={submitting || Boolean(createdOrder)}
                  className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {submitting
                    ? "Đang tạo đơn hàng..."
                    : createdOrder
                      ? "Đơn hàng đã được tạo"
                      : paymentMethod === "VNPAY"
                        ? "Thanh toán qua VNPay Sandbox"
                        : paymentMethod === "STRIPE"
                          ? "Thanh toán qua Stripe"
                          : paymentMethod === "MOMO"
                            ? "Thanh toán qua MoMo"
                            : paymentMethod === "SEPAY"
                              ? "Lấy mã QR thanh toán SePay"
                              : "Tạo hướng dẫn chuyển khoản"}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                  {paymentMethod === "VNPAY"
                    ? "Thanh toán VNPay Sandbox"
                    : paymentMethod === "STRIPE"
                      ? "Cổng quốc tế Stripe"
                      : paymentMethod === "MOMO"
                        ? "Ví điện tử MoMo"
                        : paymentMethod === "SEPAY"
                          ? "Quét mã SePay tự động"
                          : "Chuyển khoản thủ công"}{" "}
                  · Bảo mật SSL
                </p>
              </aside>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white px-5 py-10 text-center shadow-xs">
              <p className="text-sm text-slate-500">Giỏ hàng của bạn đang trống.</p>
              <Link
                href="/courses"
                className="focus-ring mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover transition"
              >
                Quay lại danh mục
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
}

function ManualPaymentInstructions({
  order,
  method,
}: {
  order: CheckoutOrder;
  method: PaymentMethod;
}) {
  const details = order.instructions;
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  if (!details) return null;
  const paymentDeadline = order.expiresAt
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(order.expiresAt))
    : null;

  const targetAccount = details.walletPhone ?? details.accountNumber ?? "";

  const copyToClipboard = (text: string, type: "content" | "account") => {
    void navigator.clipboard.writeText(text).then(() => {
      if (type === "content") {
        setCopiedContent(true);
        window.setTimeout(() => setCopiedContent(false), 2000);
      } else {
        setCopiedAccount(true);
        window.setTimeout(() => setCopiedAccount(false), 2000);
      }
    });
  };

  const handleDownloadQr = () => {
    if (!details.qrUrl) return;
    const link = document.createElement("a");
    link.href = details.qrUrl;
    link.download = `vietqr-${formatOrderCode(order.orderId)}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      id="manual-payment-instructions"
      className="mt-4 scroll-mt-24 rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-5 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-primary">
          <Check className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[#101a2c]">
            {method === "SEPAY"
              ? "Đơn hàng đang chờ thanh toán (Tự động kích hoạt 24/7)"
              : "Đơn hàng đang chờ đối soát"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {method === "SEPAY"
              ? "Quét mã QR và chuyển khoản đúng số tiền, nội dung bên dưới. Khóa học sẽ tự động mở ngay sau khi SePay ghi nhận giao dịch thành công."
              : "Chuyển đúng số tiền và nhập mã đơn hàng ở nội dung. Khóa học sẽ mở sau khi quản trị viên xác nhận giao dịch."}
          </p>
          {paymentDeadline ? (
            <p className="mt-1 text-xs font-medium text-amber-800">
              Vui lòng hoàn tất thanh toán trước {paymentDeadline}; sau thời điểm này đơn hàng sẽ tự
              hủy.
            </p>
          ) : null}
        </div>
      </div>

      {details.qrUrl && (
        <div className="mt-5 text-center">
          <div className="inline-block rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs">
            <Image
              src={details.qrUrl}
              alt="Mã VietQR để chuyển khoản"
              width={240}
              height={240}
              unoptimized
              className="rounded-xl"
            />
            <p className="mt-2 text-[11px] font-medium text-slate-500">
              Quét bằng ứng dụng ngân hàng hoặc MoMo
            </p>
          </div>
        </div>
      )}

      <dl className="mt-5 grid gap-2.5 text-xs sm:grid-cols-2">
        <PaymentDetail
          label="Ngân hàng / ví"
          value={details.bankName ?? (details.walletPhone ? "MoMo" : "")}
        />
        <PaymentDetail label="Người nhận" value={details.recipientName} />
        <PaymentDetail
          label={method === "MOMO" ? "Số điện thoại MoMo" : "Số tài khoản"}
          value={targetAccount}
          onCopy={targetAccount ? () => copyToClipboard(targetAccount, "account") : undefined}
          copied={copiedAccount}
        />
        <PaymentDetail label="Số tiền" value={formatVND(details.amount)} />
        <PaymentDetail
          label="Nội dung chuyển khoản"
          value={details.transferReference}
          onCopy={() => copyToClipboard(details.transferReference, "content")}
          copied={copiedContent}
          highlight
        />
        <PaymentDetail label="Mã đơn hàng" value={formatOrderCode(order.orderId)} />
        {paymentDeadline ? <PaymentDetail label="Hạn thanh toán" value={paymentDeadline} /> : null}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-emerald-100 pt-3">
        {targetAccount && (
          <button
            type="button"
            onClick={() => copyToClipboard(targetAccount, "account")}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:border-primary hover:text-primary transition"
          >
            {copiedAccount ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copiedAccount ? "Đã sao chép STK" : "Sao chép số tài khoản"}
          </button>
        )}
        <button
          type="button"
          onClick={() => copyToClipboard(details.transferReference, "content")}
          className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:border-primary hover:text-primary transition"
        >
          {copiedContent ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copiedContent ? "Đã sao chép nội dung" : "Sao chép nội dung chuyển khoản"}
        </button>
        {details.qrUrl && (
          <button
            type="button"
            onClick={handleDownloadQr}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:border-primary hover:text-primary transition"
          >
            <Download className="h-3.5 w-3.5" />
            Tải ảnh mã QR
          </button>
        )}
        <Link
          href={`/checkout/result?vnp_TxnRef=${encodeURIComponent(order.orderId)}`}
          className="focus-ring ml-auto inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold text-primary hover:bg-emerald-100/60 transition"
        >
          Xem trạng thái đơn hàng →
        </Link>
      </div>
    </section>
  );
}

function PaymentDetail({
  label,
  value,
  onCopy,
  copied,
  highlight = false,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative min-w-0 rounded-xl border p-3 shadow-2xs transition",
        highlight
          ? "border-emerald-300 bg-emerald-50/80"
          : "border-slate-200/80 bg-white hover:border-slate-300",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            title={`Sao chép ${label}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Đã chép
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-slate-400 group-hover:text-primary" /> Sao chép
              </>
            )}
          </button>
        )}
      </div>
      <dd
        className={cn(
          "mt-1 break-all font-semibold",
          highlight ? "text-base text-emerald-900 tracking-wide font-mono" : "text-slate-800",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function formatDuration(seconds: number) {
  return seconds >= 3600 ? `${Math.round(seconds / 3600)} giờ` : `${Math.ceil(seconds / 60)} phút`;
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
      className={cn(
        "flex items-center justify-between gap-3 text-sm",
        strong ? "text-slate-900 font-bold" : "text-slate-600",
      )}
    >
      <span className={strong ? "font-bold text-slate-800" : "font-normal text-slate-600"}>
        {label}
      </span>
      <span
        className={cn(
          "text-right font-semibold",
          strong ? "text-xl font-bold text-primary" : "text-slate-800",
        )}
      >
        {value}
      </span>
    </div>
  );
}
