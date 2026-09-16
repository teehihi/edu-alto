export function CourseCardSkeleton() {
  return (
    <div className="rounded-lg bg-white p-6 shadow-soft" aria-label="Đang tải khóa học">
      <div className="skeleton h-60 w-full" />
      <div className="mt-8 space-y-3">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-7 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
      </div>
    </div>
  );
}
