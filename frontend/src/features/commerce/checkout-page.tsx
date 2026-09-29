"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { readCart, type CartCourse } from "@/lib/cart";
import { formatVND } from "@/lib/format";

type PaymentMethod = "card" | "paypal" | "momo" | "vnpay";

export function CheckoutPage() {
  const [courses, setCourses] = useState<CartCourse[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [message, setMessage] = useState("");
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
      <main className="container-page min-h-[610px] flex-1 py-8 md:py-10">
        <nav aria-label="Đường dẫn" className="mb-6 flex items-center gap-2 text-xs text-[#7f8a86]">
          <Link href="/courses" className="focus-ring rounded hover:text-primary">
            Chi tiết khóa học
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/cart" className="focus-ring rounded hover:text-primary">
            Giỏ hàng
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-primary">Thanh toán</span>
        </nav>
        <h1 className="text-2xl font-semibold text-primary md:text-3xl">Thanh toán</h1>
        {courses.length ? (
          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
            <form
              id="checkout-form"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage(
                  "Thanh toán trực tuyến đang được hoàn thiện. Chưa có giao dịch hoặc đơn hàng nào được tạo.",
                );
              }}
              className="rounded-xl border border-[#e2eaf0] p-4 md:min-h-[550px] md:p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-primary">
                  Họ và tên
                  <input
                    required
                    autoComplete="name"
                    placeholder="Nhập họ và tên"
                    className="focus-ring mt-2 h-10 w-full rounded-lg border border-[#e2eaf0] px-3 text-sm text-[#101a2c] outline-none placeholder:text-[#a0aaa6]"
                  />
                </label>
                <label className="text-xs font-medium text-primary">
                  Số điện thoại
                  <input
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Nhập số điện thoại"
                    className="focus-ring mt-2 h-10 w-full rounded-lg border border-[#e2eaf0] px-3 text-sm text-[#101a2c] outline-none placeholder:text-[#a0aaa6]"
                  />
                </label>
              </div>
              <fieldset className="mt-6">
                <legend className="text-xs font-semibold text-primary">
                  Phương thức thanh toán
                </legend>
                <div className="mt-3 space-y-2">
                  {(
                    [
                      ["card", "Thẻ tín dụng/Ghi nợ", "VISA · Mastercard"],
                      ["paypal", "PayPal", "PayPal"],
                      ["momo", "MOMO", "MoMo"],
                      ["vnpay", "VNPAY", "VNPAY"],
                    ] as const
                  ).map(([value, label, detail]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer flex-wrap items-center gap-3 rounded-lg px-3 py-3 transition ${paymentMethod === value ? "bg-[#f6f8fa]" : "bg-[#f6f8fa] hover:bg-[#eff8f5]"}`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={value}
                        checked={paymentMethod === value}
                        onChange={() => setPaymentMethod(value)}
                        className="h-4 w-4 accent-[#20b486]"
                      />
                      <span className="min-w-0 flex-1 text-xs font-semibold text-[#101a2c]">
                        {label}
                      </span>
                      <span className="text-[11px] font-bold text-primary" aria-hidden="true">
                        {detail}
                      </span>
                      {paymentMethod === value && <span className="sr-only">Đã chọn</span>}
                    </label>
                  ))}
                </div>
                {paymentMethod === "card" && (
                  <div className="mt-2 space-y-3 rounded-lg bg-[#f6f8fa] p-3">
                    <label className="block text-[10px] text-[#34413c]">
                      Tên chủ thẻ
                      <input
                        disabled
                        autoComplete="off"
                        placeholder="Cổng thanh toán chưa được kết nối"
                        className="mt-1.5 h-10 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-xs text-[#94a3b8] disabled:cursor-not-allowed"
                      />
                    </label>
                    <label className="block text-[10px] text-[#34413c]">
                      Số thẻ
                      <input
                        disabled
                        autoComplete="off"
                        placeholder="Nhập thông tin khi thanh toán được hỗ trợ"
                        className="mt-1.5 h-10 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-xs text-[#94a3b8] disabled:cursor-not-allowed"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block text-[10px] text-[#34413c]">
                        Ngày hết hạn
                        <input
                          disabled
                          autoComplete="off"
                          placeholder="MM/YY"
                          className="mt-1.5 h-10 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-xs text-[#94a3b8] disabled:cursor-not-allowed"
                        />
                      </label>
                      <label className="block text-[10px] text-[#34413c]">
                        CVC/CVV
                        <input
                          disabled
                          autoComplete="off"
                          placeholder="•••"
                          className="mt-1.5 h-10 w-full rounded-md border border-[#e2e8f0] bg-white px-3 text-xs text-[#94a3b8] disabled:cursor-not-allowed"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </fieldset>
              <div className="mt-5 flex items-start gap-2 rounded-lg bg-[#f5faf8] p-3 text-xs leading-5 text-[#75817c]">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Cổng thanh toán chưa được kết nối. Không nhập hoặc gửi thông tin thẻ; các trường thẻ
                đang khóa cho đến khi thanh toán được hỗ trợ.
              </div>
              {message && (
                <p
                  role="status"
                  className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                >
                  {message}
                </p>
              )}
            </form>
            <aside className="rounded-xl border border-[#e2eaf0] p-4">
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
                className="focus-ring mt-5 h-11 w-full rounded-lg bg-[#079b70] text-sm font-semibold text-white transition hover:bg-[#078561]"
              >
                Tiến hành thanh toán
              </button>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-5 text-[#84908b]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                Thanh toán chưa khả dụng; chưa có đơn hàng hoặc giao dịch được tạo.
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
