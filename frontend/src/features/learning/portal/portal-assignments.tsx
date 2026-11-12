"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import { fetchMyAssignments, submitAssignment, type Assignment } from "@/lib/assignment-client";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";

export function AssignmentsView() {
  const { getAccessToken } = useAuthSession();
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "upcoming" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setAssignments(await fetchMyAssignments(token));
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Không thể tải danh sách bài tập.",
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);
  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);
  const visibleAssignments = assignments.filter((item) => {
    const matchesStatus =
      filter === "all" || (filter === "todo" ? !item.submittedAt : Boolean(item.submittedAt));
    const overdue = Boolean(item.dueAt && new Date(item.dueAt) < new Date() && !item.submittedAt);
    const matchesDate = dateFilter === "all" || (dateFilter === "overdue" ? overdue : !overdue);
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    return (
      matchesStatus &&
      matchesDate &&
      (!query || `${item.title} ${item.courseTitle}`.toLocaleLowerCase("vi").includes(query))
    );
  });
  async function saveSubmission(assignment: Assignment) {
    if (!responseText.trim()) {
      setMessage("Nhập nội dung bài làm trước khi nộp.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await submitAssignment(token, assignment.id, responseText.trim());
      setMessage("Bài làm đã được nộp.");
      setActiveId(null);
      await loadAssignments();
    } catch (reason) {
      setError(reason instanceof ApiClientError ? reason.message : "Không thể nộp bài lúc này.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 w-full max-w-[310px] items-center gap-2 rounded-md border border-[#e5e9ec] bg-white px-2">
          <Search className="h-4 w-4 text-[#8d969b]" />
          <span className="sr-only">Tìm bài tập</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm kiếm bài tập..."
            className="min-w-0 flex-1 text-xs outline-none"
          />
        </label>
        <div className="ml-auto flex items-center gap-2 text-xs text-[#727272]">
          Lọc theo{" "}
          <select
            aria-label="Lọc ngày hết hạn"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}
            className="focus-ring h-9 rounded-md border border-[#dce8e3] bg-white px-2"
          >
            <option value="all">Mọi ngày</option>
            <option value="upcoming">Còn hạn</option>
            <option value="overdue">Quá hạn</option>
          </select>
          <select
            aria-label="Lọc trạng thái bài tập"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="focus-ring h-9 rounded-md border border-[#dce8e3] bg-white px-2"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="todo">Cần hoàn thành</option>
            <option value="done">Đã hoàn thành</option>
          </select>
        </div>
      </div>
      <section className="overflow-hidden rounded-lg border border-[#e5e9ec] bg-white">
        {message && (
          <p role="status" className="mt-4 text-sm text-primary">
            {message}
          </p>
        )}
        {error && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2">
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadAssignments()}
              className="focus-ring rounded-md px-2 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              Thử tải lại
            </button>
          </div>
        )}
        {loading ? (
          <p className="p-6 text-sm text-[#87928d]">Đang tải bài tập…</p>
        ) : visibleAssignments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-xs">
              <thead className="bg-[#fafafa] text-[#079367]">
                <tr>
                  {[
                    "Tên bài tập",
                    "Khóa học",
                    "Chương",
                    "Ngày hết hạn",
                    "Trạng thái",
                    "Bài nộp",
                  ].map((label) => (
                    <th key={label} className="border-b border-[#e5e7eb] px-3 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f2]">
                {visibleAssignments.map((assignment) => {
                  const overdue =
                    !assignment.submittedAt &&
                    Boolean(assignment.dueAt && new Date(assignment.dueAt) < new Date());
                  return (
                    <Fragment key={assignment.id}>
                      <tr className="hover:bg-[#fcfefd]">
                        <td className="max-w-[190px] truncate px-3 py-3 font-medium text-[#222]">
                          {assignment.title}
                        </td>
                        <td className="max-w-[170px] truncate px-3 py-3 text-[#727272]">
                          {assignment.courseTitle}
                        </td>
                        <td className="max-w-[170px] truncate px-3 py-3 text-[#727272]">
                          {assignment.description?.split(/[.!?]/)[0] || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[#727272]">
                          {assignment.dueAt
                            ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                                new Date(assignment.dueAt),
                              )
                            : "Không giới hạn"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex whitespace-nowrap items-center rounded-full px-2 py-1 text-[10px]",
                              assignment.submittedAt
                                ? "bg-emerald-50 text-emerald-700"
                                : overdue
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-blue-50 text-blue-600",
                            )}
                          >
                            {assignment.submittedAt
                              ? "● Đã nộp"
                              : overdue
                                ? "● Quá hạn"
                                : "● Đang thực hiện"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {overdue ? (
                            <span className="text-[#cbd2d8]">Không thể nộp</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setResponseText(assignment.responseText ?? "");
                                setActiveId(activeId === assignment.id ? null : assignment.id);
                                setMessage("");
                              }}
                              className="focus-ring rounded px-1 font-medium text-primary hover:underline"
                            >
                              {assignment.submittedAt ? "Đã nộp" : "Nộp bài"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {activeId === assignment.id && (
                        <tr>
                          <td colSpan={6} className="bg-[#fcfefd] p-4">
                            {assignment.feedback && (
                              <p className="mt-3 rounded-lg bg-[#f6f9f7] p-3 text-sm text-[#47534e]">
                                Nhận xét: {assignment.feedback}
                              </p>
                            )}
                            {!assignment.submittedAt ? (
                              <div className="mt-4 space-y-3">
                                <label className="block text-xs font-medium text-[#47534e]">
                                  Bài làm
                                  <textarea
                                    value={responseText}
                                    onChange={(event) => setResponseText(event.target.value)}
                                    maxLength={50000}
                                    rows={5}
                                    className="focus-ring mt-1.5 w-full rounded-lg border border-[#dfe8e3] p-3 text-sm"
                                    placeholder="Nhập câu trả lời của bạn"
                                  />
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => void saveSubmission(assignment)}
                                    className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                  >
                                    {saving ? "Đang nộp…" : "Nộp bài"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveId(null)}
                                    className="focus-ring rounded-lg border px-4 py-2 text-sm"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm">
                                <p>{assignment.description}</p>
                                <p className="mt-2">
                                  Điểm tối đa: {assignment.maxScore}
                                  {assignment.score !== null && ` · Điểm: ${assignment.score}`}
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-lg bg-[#f8fbf9] p-7 text-center">
            <Check className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium text-[#47534e]">
              {filter === "done"
                ? "Chưa có bài đã nộp"
                : filter === "todo"
                  ? "Bạn đã hoàn thành các bài tập"
                  : "Chưa có bài tập"}
            </p>
            <p className="mt-1 text-xs text-[#87928d]">
              Bài tập đã xuất bản trong khóa học của bạn sẽ hiển thị tại đây.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
