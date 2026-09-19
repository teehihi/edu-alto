import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function LearningPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5FBF9]">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-soft text-primary shadow-xs">
            <BookOpen className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-ink">Quản lý học tập</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tính năng đang được hoàn thiện và sẽ sớm ra mắt trong các phiên bản tiếp theo.
          </p>
          <div className="mt-6">
            <Link
              href="/profile"
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-hover active:bg-primary-active"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại trang cá nhân</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
