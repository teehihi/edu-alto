"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, FileText, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPublicCourses } from "@/lib/course-client";
import type { CourseListItem } from "@/types/course";

function formatPrice(price: number): string {
  if (price === 0) return "Miễn phí";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

const statusBadge: Record<string, { label: string; className: string }> = {
  PUBLISHED: {
    label: "Đang xuất bản",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DRAFT: {
    label: "Bản nháp",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  ARCHIVED: {
    label: "Đã lưu trữ",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");

  const loadAllCourses = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchPublicCourses({ size: 50 });
      setCourses(items);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllCourses();
  }, [loadAllCourses]);

  const filteredCourses = courses.filter((c) => {
    const matchesKeyword =
      !searchKeyword ||
      c.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (c.instructor?.fullName || "").toLowerCase().includes(searchKeyword.toLowerCase());

    const matchesLevel = selectedLevel === "ALL" || c.level === selectedLevel;

    return matchesKeyword && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-heading sm:text-2xl">Quản lý khóa học</h2>
          <p className="mt-1 text-sm text-muted">
            Kiểm duyệt nội dung, theo dõi trạng thái xuất bản và số lượng học viên toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAllCourses()}
            disabled={loading}
            className="focus-ring border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Link
            href="/instructor/courses/new"
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#159e75]"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo khóa học mới</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học hoặc giảng viên..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="focus-ring w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-sm text-heading placeholder:text-slate-400 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="focus-ring rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white"
          >
            <option value="ALL">Tất cả cấp độ</option>
            <option value="BEGINNER">Cơ bản</option>
            <option value="INTERMEDIATE">Trung cấp</option>
            <option value="ADVANCED">Nâng cao</option>
          </select>

          <span className="text-xs font-semibold text-muted">
            Hiển thị <strong>{filteredCourses.length}</strong> khóa học
          </span>
        </div>
      </div>

      {/* Courses Table / Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Khóa học</th>
                <th className="px-6 py-4">Giảng viên</th>
                <th className="px-6 py-4">Học phí</th>
                <th className="px-6 py-4">Bài học</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted">
                    Đang tải danh sách khóa học...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted">
                    Không tìm thấy khóa học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => {
                  const status = statusBadge["PUBLISHED"];
                  return (
                    <tr key={c.id} className="transition hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="max-w-md">
                          <Link
                            href={`/courses/${c.slug}`}
                            target="_blank"
                            className="font-semibold text-heading hover:text-primary hover:underline line-clamp-1"
                          >
                            {c.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted line-clamp-1">
                            Cấp độ: {c.level || "Cơ bản"} • Ngôn ngữ: {c.language || "Tiếng Việt"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-heading">
                        {c.instructor?.fullName || "Chưa cập nhật"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-primary">
                        {formatPrice(c.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted">
                        {c.publishedAt
                          ? new Date(c.publishedAt).toLocaleDateString("vi-VN")
                          : "Bản nháp"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/courses/${c.slug}`}
                            target="_blank"
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-heading"
                            title="Xem trang khóa học"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/instructor/courses/${c.slug}/curriculum`}
                            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-heading"
                            title="Chỉnh sửa giáo trình"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
