import { SearchX } from "lucide-react";

export function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <SearchX className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-semibold text-ink">Chưa có dữ liệu phù hợp</h3>
      <p className="mt-2 text-sm text-muted">
        Hãy thử thay đổi bộ lọc hoặc quay lại sau khi có nội dung mới.
      </p>
    </div>
  );
}
