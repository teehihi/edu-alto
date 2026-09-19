import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Basic Card Skeleton loader (Title + Body description)
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full rounded-xl border border-slate-100 bg-white p-5 shadow-soft", className)}>
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
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-soft" aria-label="Đang tải khóa học">
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
    <div className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden" aria-label="Đang tải trang đăng nhập">
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
    <div className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden" aria-label="Đang tải trang đăng ký">
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
    <div className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden" aria-label="Đang tải trang quên mật khẩu">
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-white p-3 sm:p-4" aria-label="Đang tải trang xác thực email">
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
    <div className="relative min-h-screen bg-white lg:h-screen lg:overflow-hidden" aria-label="Đang tải trang tạo mật khẩu mới">
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-8" aria-label="Đang tải thông tin hồ sơ">
      {/* Left Sidebar */}
      <aside className="lg:sticky lg:top-24 lg:col-span-4 xl:col-span-3 space-y-6">
        {/* Card 1: Avatar & Basic Info */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 text-center shadow-sm">
          {/* Decorative Dot Grid */}
          <div className="pointer-events-none absolute left-6 top-6 grid grid-cols-3 gap-2 opacity-30" aria-hidden="true">
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
