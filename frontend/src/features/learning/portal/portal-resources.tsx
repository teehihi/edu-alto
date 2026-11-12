"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Download,
  FileText,
  FolderClosed,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/cn";
import {
  fetchLessonResourceDownload,
  fetchSavedLessonResources,
  recordLearningActivity,
  triggerResourceDownload,
  unsaveLearningResource,
  type SavedLessonResource,
} from "@/lib/learning-client";

export function ResourcesView() {
  const { getAccessToken } = useAuthSession();
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<SavedLessonResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAttachmentId, setBusyAttachmentId] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getAccessToken()
      .then(async (token) => {
        if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        const firstPage = await fetchSavedLessonResources(token, 0, 100);
        const loadedResources = [...firstPage.data];
        for (let pageNumber = 1; pageNumber < firstPage.meta.totalPages; pageNumber += 1) {
          const page = await fetchSavedLessonResources(token, pageNumber, 100);
          loadedResources.push(...page.data);
        }
        if (active) setResources(loadedResources);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Không thể tải tài liệu đã lưu.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getAccessToken]);

  const courses = Array.from(
    new Map(
      resources.map((resource): [string, string] => [resource.courseId, resource.courseTitle]),
    ).entries(),
  );
  const visibleResources = resources.filter((resource) => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    return (
      (courseFilter === "all" || resource.courseId === courseFilter) &&
      (!normalizedQuery ||
        resource.fileName.toLocaleLowerCase("vi-VN").includes(normalizedQuery) ||
        resource.courseTitle.toLocaleLowerCase("vi-VN").includes(normalizedQuery) ||
        resource.lessonTitle.toLocaleLowerCase("vi-VN").includes(normalizedQuery))
    );
  });

  async function downloadResource(resource: SavedLessonResource) {
    setBusyAttachmentId(resource.attachmentId);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const download = await fetchLessonResourceDownload(
        token,
        resource.lessonId,
        resource.attachmentId,
      );
      triggerResourceDownload(download.downloadUrl);
      void recordLearningActivity(token, {
        courseId: resource.courseId,
        lessonId: resource.lessonId,
        activityType: "RESOURCE_DOWNLOADED",
        metadata: JSON.stringify({
          attachment_id: resource.attachmentId,
          file_name: resource.fileName,
          source: "saved_resources",
        }),
      }).catch(() => undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể tải tài liệu.");
    } finally {
      setBusyAttachmentId(null);
    }
  }

  async function removeResource(attachmentId: string) {
    setBusyAttachmentId(attachmentId);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      await unsaveLearningResource(token, attachmentId);
      setResources((current) => current.filter((item) => item.attachmentId !== attachmentId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể xóa tài liệu khỏi thư viện.");
    } finally {
      setBusyAttachmentId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-base font-semibold text-primary">
          Tài liệu đã lưu <span className="text-xs">({resources.length})</span>
        </h1>
        <label className="ml-auto flex h-9 w-full max-w-[300px] items-center gap-2 rounded-md border border-[#dce8e3] bg-white px-2">
          <span className="sr-only">Tìm kiếm tài liệu</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên tài liệu hoặc khóa học..."
            className="min-w-0 flex-1 text-xs outline-none"
          />
          <Search className="h-4 w-4 text-primary" />
        </label>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2">
          Khóa học:
          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            className="focus-ring h-9 w-[205px] rounded-md border border-[#dce8e3] bg-white px-2"
          >
            <option value="all">Tất cả</option>
            {courses.map(([courseId, title]) => (
              <option key={courseId} value={courseId}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Xếp theo
          </button>
          <button
            type="button"
            className="focus-ring flex h-9 items-center gap-2 rounded-md border border-primary px-3"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Lọc
          </button>
        </div>
      </div>
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}
      {loading ? (
        <div role="status" aria-label="Đang tải tài liệu đã lưu" className="space-y-3">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
      ) : error ? null : visibleResources.length ? (
        <section aria-label="Tài liệu trong thư viện" className="space-y-3">
          {visibleResources.map((resource) => {
            const isBusy = busyAttachmentId === resource.attachmentId;
            const typeLabel =
              resource.contentType === "application/pdf"
                ? "PDF"
                : resource.contentType.includes("word") ||
                    resource.contentType === "application/msword"
                  ? "Word"
                  : resource.contentType.includes("presentation")
                    ? "PowerPoint"
                    : resource.contentType.includes("spreadsheet")
                      ? "Excel"
                      : "Tài liệu";
            const fileSize =
              resource.contentLength < 1024 * 1024
                ? `${Math.max(1, Math.round(resource.contentLength / 1024))} KB`
                : `${(resource.contentLength / (1024 * 1024)).toFixed(1)} MB`;
            return (
              <article
                key={resource.attachmentId}
                className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:flex-nowrap sm:px-4"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-[10px]",
                    resource.contentType === "application/pdf"
                      ? "bg-rose-100 text-rose-600"
                      : "bg-blue-100 text-blue-600",
                  )}
                >
                  <FileText aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#101a2c]">
                    {resource.fileName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[#64748b]">
                    {typeLabel} · {fileSize} · {resource.courseTitle} · {resource.lessonTitle}
                  </span>
                </span>
                <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => void removeResource(resource.attachmentId)}
                    disabled={isBusy}
                    aria-label={`Xóa ${resource.fileName} khỏi thư viện`}
                    className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#dce8e3] px-3 text-xs font-semibold text-[#475569] transition hover:bg-[#f8fcfa] disabled:cursor-wait disabled:opacity-60"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Bỏ lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadResource(resource)}
                    disabled={isBusy}
                    className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isBusy ? (
                      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download aria-hidden="true" className="h-4 w-4" />
                    )}
                    {isBusy ? "Đang xử lý…" : "Tải về"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="portal-card grid min-h-[300px] place-items-center text-center">
          <div>
            <FolderClosed className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 text-sm font-semibold">
              {resources.length ? "Không tìm thấy tài liệu phù hợp" : "Chưa có tài liệu đã lưu"}
            </h2>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[#87928d]">
              {resources.length
                ? "Thử từ khóa khác để tìm tài liệu trong thư viện."
                : "Tài liệu bạn lưu từ các bài học sẽ xuất hiện tại đây."}
            </p>
            {!resources.length ? (
              <Link
                href="/learning/courses"
                className="focus-ring mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-white"
              >
                <BookOpen className="h-4 w-4" /> Mở khóa học
              </Link>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
