import Link from "next/link";
import { BookOpen } from "lucide-react";

export function InstructorPurchaseNotice() {
  return (
    <section className="mx-auto grid min-h-[360px] max-w-xl place-items-center rounded-2xl border border-slate-200/90 bg-white px-6 py-10 text-center shadow-xs">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
          <BookOpen className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-heading">Giảng viên chỉ có thể xem khóa học</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Tài khoản giảng viên không thể thêm khóa học vào giỏ hoặc thanh toán.
        </p>
        <Link
          href="/courses"
          className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark active:bg-primary-dark"
        >
          Xem danh mục khóa học
        </Link>
      </div>
    </section>
  );
}
