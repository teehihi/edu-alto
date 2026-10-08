"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { formatVND } from "@/lib/format";
import { readCart, removeCourseFromCart, type CartCourse } from "@/lib/cart";
import { useAuthSession } from "@/lib/auth-session";
import { InstructorPurchaseNotice } from "@/features/commerce/instructor-purchase-notice";

export function CartPage() {
  const { user, isLoading: authLoading } = useAuthSession();
  const [isMounted, setIsMounted] = useState(false);
  const [courses, setCourses] = useState<CartCourse[]>([]);
  const [coupon, setCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
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
  const subtotal = courses.reduce((total, course) => total + course.price, 0);
  const isInstructor =
    user?.roles.some((role) => role === "INSTRUCTOR" || role === "ROLE_INSTRUCTOR") ?? false;

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="bg-gradient-to-b from-[#e5f8f2] to-white">
          <AppHeader />
        </div>
        <main className="container-page grid min-h-[560px] flex-1 place-items-center py-8">
          <p role="status" className="text-sm text-muted">
            Đang kiểm tra tài khoản...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (isInstructor) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="bg-gradient-to-b from-[#e5f8f2] to-white">
          <AppHeader />
        </div>
        <main className="container-page grid flex-1 place-items-center py-8">
          <InstructorPurchaseNotice />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="flex min-h-screen flex-col bg-white">
      <div className="bg-gradient-to-b from-[#e5f8f2] to-white">
        <AppHeader />
      </div>
      <main className="container-page min-h-[560px] flex-1 py-8 md:py-10">
        <nav aria-label="Đường dẫn" className="mb-5 flex items-center gap-2 text-xs text-[#7f8a86]">
          <Link href="/courses" className="focus-ring rounded hover:text-primary">
            Danh mục
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-primary" aria-current="page">
            Giỏ hàng
          </span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-primary">Giỏ hàng</h1>
            <p className="mt-2 text-xs text-[#75817c]">
              {isMounted ? `${courses.length} khóa học trong giỏ hàng` : "Đang tải giỏ hàng…"}
            </p>
          </div>
        </div>
        {!isMounted ? (
          <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="h-64 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse" />
            <div className="h-64 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse" />
          </div>
        ) : courses.length ? (
          <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_330px]">
            <section
              aria-label="Khóa học trong giỏ hàng"
              className="divide-y divide-[#e7edeb] border-y border-[#e7edeb]"
            >
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <Link
                    href={`/courses/${course.slug}`}
                    className="focus-ring relative aspect-video w-full shrink-0 overflow-hidden rounded-md bg-[#e8f7f2] sm:h-[88px] sm:w-36 sm:aspect-auto"
                  >
                    {course.thumbnailUrl ? (
                      <Image
                        src={course.thumbnailUrl}
                        alt={course.title}
                        fill
                        unoptimized
                        sizes="144px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-primary">
                        <BookOpen className="h-8 w-8" />
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="focus-ring rounded text-sm font-semibold text-primary hover:underline"
                    >
                      {course.title}
                    </Link>
                    <p className="mt-1 text-xs text-[#77837e]">Bởi {course.instructorName}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:w-32 sm:flex-col sm:items-end sm:gap-1">
                    <p className="text-base font-bold text-[#101a2c]">{formatVND(course.price)}</p>
                    <button
                      type="button"
                      onClick={() => setCourses(removeCourseFromCart(course.id))}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 active:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </section>
            <aside className="rounded-xl border border-[#e2eaf0] bg-white p-4">
              <h2 className="text-sm font-semibold text-primary">Chi tiết đơn hàng</h2>
              <form
                className="mt-4 flex"
                onSubmit={(event) => {
                  event.preventDefault();
                  setCouponMessage(
                    coupon.trim() ? "Mã ưu đãi chưa khả dụng." : "Vui lòng nhập mã ưu đãi.",
                  );
                }}
              >
                <label className="sr-only" htmlFor="cart-coupon">
                  Mã ưu đãi
                </label>
                <input
                  id="cart-coupon"
                  value={coupon}
                  onChange={(event) => {
                    setCoupon(event.target.value);
                    setCouponMessage("");
                  }}
                  placeholder="Nhập mã giảm giá"
                  className="h-10 min-w-0 flex-1 rounded-l-lg border border-r-0 border-[#e2eaf0] px-3 text-xs outline-none focus:border-primary"
                />
                <button className="focus-ring h-10 rounded-r-lg bg-[#079b70] px-4 text-xs font-semibold text-white hover:bg-[#078561]">
                  Áp dụng
                </button>
              </form>
              {couponMessage && (
                <p role="status" className="mt-2 text-xs text-[#697670]">
                  {couponMessage}
                </p>
              )}
              <div className="mt-4 space-y-3 rounded-lg border border-[#e5ece9] bg-[#f8fbfa] p-3 text-xs">
                <SummaryRow label="Tạm tính" value={formatVND(subtotal)} />
                <SummaryRow label="Giảm giá" value="Chưa áp dụng" />
                <SummaryRow label="Thuế/Phí" value="Chưa tính" />
                <div className="border-t border-[#e5ece9] pt-3">
                  <SummaryRow label="Tổng tạm tính" value={formatVND(subtotal)} strong />
                </div>
              </div>
              <Link
                href="/checkout"
                className="focus-ring mt-4 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#079b70] text-base font-semibold text-white transition hover:bg-[#078561] active:bg-[#067454]"
              >
                Tiếp tục thanh toán
                <ChevronRight className="h-4 w-4" />
              </Link>
              <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#84908b]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Chưa có giao dịch nào được xử lý trực tuyến.
              </div>
            </aside>
          </div>
        ) : (
          <div className="mt-8 grid min-h-[340px] place-items-center rounded-2xl border border-dashed border-[#dce8e2] bg-[#fbfefc] px-5 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e6faf3] text-primary">
                <ShoppingCart className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Giỏ hàng đang trống</h2>
              <p className="mt-2 text-sm leading-6 text-[#7e8985]">
                Lưu những khóa học bạn quan tâm để xem lại tại đây.
              </p>
              <Link
                href="/courses"
                className="focus-ring mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
              >
                Khám phá khóa học
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
        <div className="mt-7 flex flex-wrap gap-4 text-xs text-[#84908b]">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-primary" />
            Truy cập khóa học mọi lúc
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CircleHelp className="h-4 w-4 text-primary" />
            Hỗ trợ học viên
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-primary" />
            Nhiều phương thức thanh toán
          </span>
        </div>
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
      className={`flex items-center justify-between gap-3 ${strong ? "mt-4 text-sm font-semibold text-primary" : "text-[#34413c]"}`}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
