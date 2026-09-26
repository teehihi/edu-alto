import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} aria-hidden="true" {...props} />;
}

/**
 * Basic Card Skeleton loader (Title + Body description)
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full rounded-xl border border-slate-100 bg-white p-5 shadow-soft",
        className,
      )}
    >
      <Skeleton className="mb-3.5 h-4 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/**
 * Course Card Skeleton loader for Course grids
 */
export function CourseCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-slate-100 bg-white p-5 shadow-soft"
      aria-label="Đang tải khóa học"
    >
      <Skeleton className="h-48 w-full rounded-lg sm:h-56" />
      <div className="mt-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Login Page Skeleton matching AuthShell (Left image + Right form)
 */
export function LoginSkeleton() {
  return (
    <div
      className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden"
      aria-label="Đang tải trang đăng nhập"
    >
      {/* Left panel placeholder */}
      <aside className="absolute inset-y-0 left-0 hidden w-[43.61%] overflow-hidden bg-slate-100 lg:block z-0">
        <Skeleton className="h-full w-full rounded-none" />
      </aside>

      {/* Right form container */}
      <main className="relative z-20 flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:h-screen lg:w-[56.39%] lg:ml-auto lg:overflow-y-auto lg:px-10 lg:py-6 xl:py-8">
        <div className="mx-auto w-full max-w-[660px]">
          {/* Logo */}
          <div className="mb-2 flex justify-center sm:mb-3">
            <Skeleton className="h-12 w-44 rounded-lg sm:h-14 md:h-16 sm:w-52" />
          </div>

          {/* Title */}
          <Skeleton className="mx-auto mb-5 h-8 w-56 rounded-lg sm:text-[28px]" />

          {/* Form fields */}
          <div className="space-y-4 sm:space-y-4.5">
            {/* Email field */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
            </div>

            {/* Checkbox and forgot password link */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>

            {/* Submit button */}
            <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />

            {/* Divider */}
            <div className="flex items-center gap-3 py-1.5">
              <Skeleton className="h-px flex-1" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-px flex-1" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Skeleton className="h-11 sm:h-12 rounded-xl" />
              <Skeleton className="h-11 sm:h-12 rounded-xl" />
              <Skeleton className="h-11 sm:h-12 rounded-xl" />
            </div>

            {/* Bottom link */}
            <div className="pt-2 flex justify-center">
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Register Page Skeleton matching AuthShell (Left form + Right image)
 */
export function RegisterSkeleton() {
  return (
    <div
      className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden"
      aria-label="Đang tải trang đăng ký"
    >
      {/* Right panel placeholder */}
      <aside className="absolute inset-y-0 right-0 hidden w-[43.61%] overflow-hidden bg-slate-100 lg:block z-0">
        <Skeleton className="h-full w-full rounded-none" />
      </aside>

      {/* Left form container */}
      <main className="relative z-20 flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:h-screen lg:w-[56.39%] lg:mr-auto lg:overflow-y-auto lg:px-10 lg:py-6 xl:py-8">
        <div className="mx-auto w-full max-w-[660px]">
          {/* Logo */}
          <div className="mb-2 flex justify-center sm:mb-3">
            <Skeleton className="h-12 w-44 rounded-lg sm:h-14 md:h-16 sm:w-52" />
          </div>

          {/* Title */}
          <Skeleton className="mx-auto mb-4 h-8 w-60 rounded-lg sm:text-[28px]" />

          {/* Form fields */}
          <div className="space-y-3 sm:space-y-3.5">
            {/* Role selector */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-56" />
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-100 p-1">
                <Skeleton className="h-10 rounded-md" />
                <Skeleton className="h-10 rounded-md" />
              </div>
            </div>

            {/* Full name field */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
            </div>

            {/* Password & Confirm password fields */}
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
              </div>
            </div>

            {/* Submit button */}
            <Skeleton className="h-11 sm:h-12 w-fit min-w-[140px] rounded-xl" />

            {/* Divider */}
            <div className="flex items-center gap-3 py-1.5">
              <Skeleton className="h-px flex-1" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-px flex-1" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Skeleton className="h-11 sm:h-12 rounded-xl" />
              <Skeleton className="h-11 sm:h-12 rounded-xl" />
              <Skeleton className="h-11 sm:h-12 rounded-xl" />
            </div>

            {/* Bottom link */}
            <div className="pt-2 flex justify-center">
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Forgot Password Skeleton
 */
export function ForgotPasswordSkeleton() {
  return (
    <div
      className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden"
      aria-label="Đang tải trang quên mật khẩu"
    >
      <aside className="absolute inset-y-0 right-0 hidden w-[43.61%] overflow-hidden bg-slate-100 lg:block z-0">
        <Skeleton className="h-full w-full rounded-none" />
      </aside>
      <main className="relative z-20 flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:h-screen lg:w-[56.39%] lg:mr-auto lg:overflow-y-auto lg:px-10 lg:py-6 xl:py-8">
        <div className="mx-auto w-full max-w-[660px]">
          <div className="mb-2 flex justify-center sm:mb-3">
            <Skeleton className="h-12 w-44 rounded-lg sm:h-14 md:h-16 sm:w-52" />
          </div>
          <Skeleton className="mx-auto mb-3 h-8 w-56 rounded-lg" />
          <Skeleton className="mx-auto mb-6 h-4 w-80 max-w-full" />
          <div className="space-y-4 sm:space-y-4.5">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
            </div>
            <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
            <div className="pt-2 flex justify-center">
              <Skeleton className="h-4 w-44" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Verify Email Page Skeleton (Single Viewport Layout)
 */
export function VerifyEmailSkeleton() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-white p-3 sm:p-4"
      aria-label="Đang tải trang xác thực email"
    >
      <div className="w-full max-w-[460px] text-center space-y-3">
        {/* Top Image Illustration */}
        <div className="flex justify-center">
          <Skeleton className="h-28 w-28 sm:h-36 sm:w-36 rounded-full" />
        </div>
        {/* Title */}
        <Skeleton className="mx-auto h-7 w-48 sm:h-8 sm:w-56" />
        {/* Description */}
        <Skeleton className="mx-auto h-4 w-72 max-w-full" />
        <Skeleton className="mx-auto h-4 w-52 max-w-full" />
        {/* 6 OTP boxes */}
        <div className="pt-2 pb-2">
          <div className="mx-auto grid max-w-[420px] grid-cols-6 gap-2.5 sm:gap-3.5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 sm:h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
        {/* Timer */}
        <Skeleton className="mx-auto h-4 w-40" />
        {/* Action Button */}
        <div className="pt-2 flex justify-center">
          <Skeleton className="h-11 sm:h-12 w-48 rounded-xl" />
        </div>
        {/* Back Link */}
        <Skeleton className="mx-auto h-4 w-36" />
      </div>
    </div>
  );
}

/**
 * Reset Password Skeleton
 */
export function ResetPasswordSkeleton() {
  return (
    <div
      className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden"
      aria-label="Đang tải trang tạo mật khẩu mới"
    >
      <aside className="absolute inset-y-0 right-0 hidden w-[43.61%] overflow-hidden bg-slate-100 lg:block z-0">
        <Skeleton className="h-full w-full rounded-none" />
      </aside>
      <main className="relative z-20 flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:h-screen lg:w-[56.39%] lg:mr-auto lg:overflow-y-auto lg:px-10 lg:py-6 xl:py-8">
        <div className="mx-auto w-full max-w-[660px]">
          <div className="mb-2 flex justify-center sm:mb-3">
            <Skeleton className="h-12 w-44 rounded-lg sm:h-14 md:h-16 sm:w-52" />
          </div>
          <Skeleton className="mx-auto mb-3 h-8 w-56 rounded-lg" />
          <Skeleton className="mx-auto mb-6 h-4 w-80 max-w-full" />
          <div className="space-y-4 sm:space-y-4.5">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
            </div>
            <div className="mx-auto grid max-w-[420px] grid-cols-6 gap-2.5 sm:gap-3.5">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-12 sm:h-14 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-11 sm:h-12 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Profile Page Skeleton loader matching EduAlto Profile Layout
 */
export function ProfileSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-8"
      aria-label="Đang tải thông tin hồ sơ"
    >
      {/* Left Sidebar */}
      <aside className="lg:sticky lg:top-24 lg:col-span-4 xl:col-span-3 space-y-6">
        {/* Card 1: Avatar & Basic Info */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 text-center shadow-sm">
          {/* Decorative Dot Grid */}
          <div
            className="pointer-events-none absolute left-6 top-6 grid grid-cols-3 gap-2 opacity-30"
            aria-hidden="true"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            ))}
          </div>

          {/* Large Avatar */}
          <div className="relative mx-auto flex items-center justify-center pt-2">
            <Skeleton className="h-32 w-32 rounded-full ring-4 ring-white shadow-sm" />
          </div>

          {/* Full Name */}
          <Skeleton className="mx-auto mt-4 h-6 w-36 rounded-md" />

          {/* Share Button Pill */}
          <div className="mt-3.5 flex justify-center">
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* Card 2: Navigation Links */}
        <div className="rounded-3xl border border-slate-100 bg-white p-2.5 shadow-sm space-y-1">
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </aside>

      {/* Right Content Area */}
      <section className="lg:col-span-8 xl:col-span-9 space-y-6">
        {/* Card 1: Profile Main Details Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header Row: Name/Headline + Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-52 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>

          {/* Bio Section */}
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>

          <div className="h-px w-full bg-slate-100" />

          {/* Stats Summary Row */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 pt-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
          </div>
        </div>

        {/* Card 2: Links / Social Details Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-sm space-y-5">
          <Skeleton className="h-5 w-24 rounded-md" />

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 p-1">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Generic Form Skeleton loader
 */
export function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-label="Đang tải biểu mẫu">
      {Array.from({ length: rows }, (_, idx) => (
        <div key={idx} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="mt-2 h-11 w-32 rounded-lg" />
    </div>
  );
}

/**
 * Home Page Skeleton matching the exact EduAlto Landing Page layout
 */
export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-white" aria-label="Đang tải trang chủ">
      {/* Header Skeleton */}
      <div className="border-b border-slate-100 bg-white">
        <div className="container-page flex min-h-[80px] items-center justify-between gap-4">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="hidden h-10 w-72 rounded-xl xl:block" />
          <div className="hidden items-center gap-6 lg:flex">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <section className="bg-[#fbfffd] py-12 lg:py-16">
        <div className="container-page grid min-h-[520px] items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-12 w-4/5 rounded-xl sm:h-14" />
              <Skeleton className="h-12 w-3/5 rounded-xl sm:h-14" />
            </div>
            <Skeleton className="h-5 w-full max-w-lg" />
            <Skeleton className="h-5 w-4/5 max-w-md" />
            <div className="flex flex-wrap gap-4 pt-2">
              <Skeleton className="h-14 w-40 rounded-xl" />
              <Skeleton className="h-14 w-44 rounded-xl" />
            </div>
            <div className="flex flex-wrap gap-6 pt-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-72 w-72 rounded-full sm:h-96 sm:w-96" />
          </div>
        </div>
      </section>

      {/* Categories & Popular Courses Skeleton */}
      <section className="container-page py-16">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-white p-5 shadow-soft">
              <Skeleton className="h-44 w-full rounded-lg" />
              <div className="mt-4 space-y-2.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Course Catalog Skeleton matching /courses layout
 */
export function CourseCatalogSkeleton() {
  return (
    <div className="min-h-screen bg-[#F9FBFA]" aria-label="Đang tải danh mục khóa học">
      {/* Header Skeleton */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <div className="hidden items-center gap-6 lg:flex">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Hero / Filter Header */}
      <section className="border-b border-slate-200/80 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs">
            <Skeleton className="h-3.5 w-16" />
            <span className="text-slate-300">/</span>
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="mt-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="space-y-2">
              <Skeleton className="h-8 w-72 rounded-lg sm:h-9" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            {/* Search Input Box */}
            <Skeleton className="h-12 w-full rounded-2xl md:w-80" />
          </div>
        </div>
      </section>

      {/* Main Catalog Grid & Filters */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Filter Sidebar */}
            <aside className="hidden space-y-6 lg:col-span-3 lg:block">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full rounded-lg" />
                </div>
              </div>
            </aside>

            {/* Right Course Cards Grid */}
            <main className="space-y-6 lg:col-span-9">
              {/* Toolbar */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-48 rounded-xl" />
              </div>

              {/* Grid of 6 Course Cards */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
                  >
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <div className="mt-4 flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-16 rounded-md" />
                        <Skeleton className="h-4 w-14" />
                      </div>
                      <Skeleton className="h-5 w-full rounded-md" />
                      <Skeleton className="h-5 w-4/5 rounded-md" />
                      <div className="flex items-center gap-2 pt-1">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-8 w-20 rounded-xl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-center gap-2 pt-6">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Course Curriculum Skeleton for /instructor/courses/[id]/curriculum
 */
export function CourseCurriculumSkeleton() {
  return (
    <div className="min-h-screen bg-[#F9FBFA]" aria-label="Đang tải chương trình học">
      {/* Top Header Placeholder */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      <main className="pb-24 pt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-28" />
              <span className="text-slate-300">/</span>
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>

          {/* Hero / Header Card */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36 rounded-full" />
                <Skeleton className="h-8 w-80 rounded-lg sm:h-9" />
                <Skeleton className="h-4 w-96 max-w-full" />
              </div>
              <Skeleton className="h-11 w-44 rounded-xl" />
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl bg-[#F5FBF9] p-3.5">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-sky-50/60 p-3.5">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-amber-50/60 p-3.5 sm:col-span-1">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
          </div>

          {/* Section Accordions Skeleton */}
          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }, (_, sIdx) => (
              <div
                key={sIdx}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                {/* Section Header */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex items-start gap-3.5 flex-1">
                    <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-16" />
                        <span className="text-slate-300">•</span>
                        <Skeleton className="h-3.5 w-16" />
                        <span className="text-slate-300">•</span>
                        <Skeleton className="h-3.5 w-14" />
                      </div>
                      <Skeleton className="h-5 w-64 rounded-md" />
                      <Skeleton className="h-3.5 w-96 max-w-full" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-28 rounded-xl" />
                  </div>
                </div>

                {/* Section Lessons Body */}
                <div className="border-t border-slate-100 bg-[#FAFBFB] p-4 sm:p-5 space-y-2">
                  {Array.from({ length: 2 }, (_, lIdx) => (
                    <div
                      key={lIdx}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-3.5 w-6" />
                            <Skeleton className="h-4 w-48 rounded-md" />
                            <Skeleton className="h-4 w-14 rounded-md" />
                          </div>
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-7 w-7 rounded" />
                        <Skeleton className="h-7 w-7 rounded" />
                        <Skeleton className="h-7 w-7 rounded" />
                        <Skeleton className="h-7 w-7 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * About Page Skeleton
 */
export function AboutSkeleton() {
  return (
    <div className="min-h-screen bg-white" aria-label="Đang tải trang về chúng tôi">
      {/* Header Skeleton */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <div className="hidden items-center gap-6 lg:flex">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      <main className="py-12 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero Row */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-6">
              <Skeleton className="h-12 w-64 rounded-xl" />
              <Skeleton className="h-6 w-80 rounded-lg" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-12 w-44 rounded-xl" />
            </div>
            <div className="space-y-4 lg:col-span-6">
              <Skeleton className="h-56 w-full rounded-3xl" />
              <Skeleton className="h-48 w-4/5 rounded-3xl" />
            </div>
          </div>

          {/* Features Row */}
          <div className="mt-24 grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Skeleton className="aspect-4/3 w-full rounded-3xl" />
            </div>
            <div className="space-y-5 lg:col-span-6">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-12 w-40 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Contact Page Skeleton
 */
export function ContactSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5FBF9]" aria-label="Đang tải trang liên hệ">
      {/* Header Skeleton */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      <main className="py-12 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-12 shadow-xl space-y-8">
            <div className="text-center space-y-2">
              <Skeleton className="mx-auto h-9 w-64 rounded-xl" />
              <Skeleton className="mx-auto h-4 w-96 max-w-full rounded-md" />
            </div>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <Skeleton className="h-5 w-48 rounded-md" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>

              <div className="space-y-4 lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-44 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
