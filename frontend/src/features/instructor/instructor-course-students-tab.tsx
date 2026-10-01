"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, GraduationCap, RefreshCw, Search } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import {
  fetchInstructorCourseStudents,
  type InstructorCourseStudent,
} from "@/lib/instructor-students-client";
import { useInstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

export function InstructorCourseStudentsTab() {
  const { accessToken, course } = useInstructorCourseWorkspace();
  const [students, setStudents] = useState<InstructorCourseStudent[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    if (!accessToken) {
      setError("Vui lòng đăng nhập để xem danh sách học viên.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInstructorCourseStudents(course.id, accessToken, page, search);
      setStudents(result.data);
      setTotalElements(result.meta.totalElements);
      setTotalPages(result.meta.totalPages);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Không thể tải danh sách học viên. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, course.id, page, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadStudents(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadStudents]);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  return (
    <section aria-labelledby="course-students-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="course-students-heading" className="text-lg font-semibold text-slate-900">
            Học viên
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {loading
              ? "Đang cập nhật danh sách…"
              : `${totalElements.toLocaleString("vi-VN")} học viên`}
          </p>
        </div>
        <label className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:max-w-[320px]">
          <span className="sr-only">Tìm theo tên hoặc email học viên</span>
          <input
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Tìm tên hoặc email…"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500"
          />
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
        </label>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-white p-4 text-sm text-rose-800"
        >
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadStudents()}
            className="focus-ring rounded px-2 py-1 font-semibold text-rose-800 hover:bg-rose-50"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Học viên
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Ngày đăng ký
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="border-t border-slate-200 px-4 py-12 text-center text-slate-600"
                >
                  <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang tải danh sách học viên…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={3} className="border-t border-slate-200 px-4 py-12 text-center">
                  <GraduationCap className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                  <p className="mt-2 font-medium text-slate-700">
                    {search.trim()
                      ? "Không tìm thấy học viên phù hợp"
                      : "Khóa học chưa có học viên"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {search.trim()
                      ? "Thử tìm bằng tên hoặc địa chỉ email khác."
                      : `Học viên đăng ký “${course.title}” sẽ xuất hiện tại đây.`}
                  </p>
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.studentId} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">{student.studentName}</td>
                  <td className="px-4 py-3 text-slate-600">{student.email}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(student.enrolledAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 ? (
        <nav
          aria-label="Phân trang danh sách học viên"
          className="mt-4 flex items-center justify-between gap-3"
        >
          <p className="text-sm text-slate-600">
            Trang {page + 1} / {totalPages} · {PAGE_SIZE} học viên mỗi trang
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="focus-ring min-h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              className="focus-ring min-h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
