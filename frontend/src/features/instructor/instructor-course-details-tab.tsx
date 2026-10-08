"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, ImagePlus, LoaderCircle, PlaySquare } from "lucide-react";
import { useInstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";
import { ApiClientError } from "@/lib/api";
import {
  publishInstructorCourse,
  updateInstructorCourse,
  uploadCourseThumbnail,
  type InstructorCourseLevel,
  type InstructorCoursePayload,
} from "@/lib/instructor-course-client";

const levelOptions: Array<{ value: InstructorCourseLevel; label: string }> = [
  { value: "ALL_LEVELS", label: "Tất cả trình độ" },
  { value: "BEGINNER", label: "Cơ bản" },
  { value: "INTERMEDIATE", label: "Trung cấp" },
  { value: "ADVANCED", label: "Nâng cao" },
];
const allowedThumbnailTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type CourseForm = InstructorCoursePayload;

function toCourseForm(
  course: ReturnType<typeof useInstructorCourseWorkspace>["course"],
): CourseForm {
  return {
    title: course.title,
    slug: course.slug,
    tagline: course.tagline ?? "",
    description: course.description ?? "",
    price: course.price,
    originalPrice: course.originalPrice,
    level: course.level,
    language: course.language,
    thumbnailKey: course.thumbnailKey,
  };
}

export function InstructorCourseDetailsTab() {
  const { accessToken, course, setCourse } = useInstructorCourseWorkspace();
  const [form, setForm] = useState<CourseForm>(() => toCourseForm(course));
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(course.thumbnailUrl);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm(toCourseForm(course));
    setThumbnailPreview(course.thumbnailUrl);
    setThumbnailFile(null);
  }, [course]);

  useEffect(() => {
    if (!thumbnailFile) return;
    const previewUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(previewUrl);
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [thumbnailFile]);

  const updateField = <K extends keyof CourseForm>(field: K, value: CourseForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
  };

  const chooseThumbnail = (file: File | null) => {
    if (!file) return;
    if (!allowedThumbnailTypes.has(file.type)) {
      setError("Vui lòng chọn ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh bìa không được vượt quá 5 MB.");
      return;
    }
    setError("");
    setSuccess("");
    setThumbnailFile(file);
  };

  const getPayload = async (): Promise<CourseForm> => {
    let thumbnailKey = form.thumbnailKey;
    if (thumbnailFile) {
      if (!accessToken) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const uploaded = await uploadCourseThumbnail(thumbnailFile, accessToken);
      thumbnailKey = uploaded.objectKey;
    }
    return {
      ...form,
      title: form.title.trim(),
      tagline: form.tagline?.trim() || null,
      description: form.description.trim(),
      price: Number(form.price),
      originalPrice:
        form.originalPrice === null || form.originalPrice === undefined
          ? null
          : Number(form.originalPrice),
      thumbnailKey,
    };
  };

  const validate = () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Vui lòng nhập tên và mô tả khóa học.");
      return false;
    }
    if (Number(form.price) < 0 || (form.originalPrice !== null && Number(form.originalPrice) < 0)) {
      setError("Giá khóa học không được âm.");
      return false;
    }
    return true;
  };

  const saveCourse = async (): Promise<boolean> => {
    if (!accessToken) {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return false;
    }
    if (!validate()) return false;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updatedCourse = await updateInstructorCourse(
        course.id,
        await getPayload(),
        accessToken,
      );
      setCourse(updatedCourse);
      setThumbnailFile(null);
      setSuccess("Đã lưu thông tin khóa học.");
      return true;
    } catch (cause) {
      setError(getCourseActionError(cause, "Không thể lưu khóa học. Vui lòng thử lại."));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveCourse();
  };

  const handlePublish = async () => {
    if (!accessToken || !validate()) return;
    setPublishing(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateInstructorCourse(course.id, await getPayload(), accessToken);
      setCourse(updated);
      setThumbnailFile(null);
      const published = await publishInstructorCourse(updated.id, accessToken);
      setCourse(published);
      setSuccess("Khóa học đã được xuất bản.");
    } catch (cause) {
      setError(getCourseActionError(cause, "Không thể xuất bản khóa học. Vui lòng thử lại."));
    } finally {
      setPublishing(false);
    }
  };

  const busy = saving || publishing;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-primary">Chi tiết khóa học</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {course.status === "DRAFT" ? "Lưu bản nháp" : "Lưu thay đổi"}
          </button>
          {course.status === "DRAFT" ? (
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={busy}
              className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 active:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {publishing ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Xuất bản
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {success}
        </p>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <label htmlFor="course-title" className="block text-sm font-semibold text-primary">
              Tên khóa học
            </label>
            <input
              id="course-title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              maxLength={255}
              required
              className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
            />
            <label
              htmlFor="course-tagline"
              className="mt-4 block text-sm font-semibold text-primary"
            >
              Mô tả ngắn
            </label>
            <input
              id="course-tagline"
              value={form.tagline ?? ""}
              onChange={(event) => updateField("tagline", event.target.value)}
              maxLength={500}
              className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
            />
          </div>

          <section
            aria-labelledby="intro-video-title"
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h3 id="intro-video-title" className="text-sm font-semibold text-primary">
              Video giới thiệu
            </h3>
            <div className="mt-3 flex min-h-24 items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              <PlaySquare className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              Backend chưa hỗ trợ lưu video giới thiệu cho khóa học. Bạn có thể thêm video trong
              phần Chương.
            </div>
          </section>

          <section
            aria-labelledby="course-thumbnail-title"
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h3 id="course-thumbnail-title" className="text-sm font-semibold text-primary">
              Tải lên ảnh bìa khóa học
            </h3>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                chooseThumbnail(event.dataTransfer.files.item(0));
              }}
              className="mt-3 flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-[#f8fafc] p-4 text-center"
            >
              {thumbnailPreview ? (
                // Thumbnail URLs come from API or a local preview URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailPreview}
                  alt="Xem trước ảnh bìa khóa học"
                  className="mb-1 aspect-video max-h-36 rounded-md object-cover"
                />
              ) : (
                <ImagePlus className="h-6 w-6 text-slate-500" aria-hidden="true" />
              )}
              <p className="text-sm font-semibold text-heading">
                Kéo thả vào đây hoặc{" "}
                <label
                  htmlFor="course-thumbnail"
                  className="cursor-pointer text-primary hover:underline"
                >
                  Chọn tệp
                </label>
              </p>
              <p className="text-xs text-slate-500">JPEG, PNG hoặc WebP · tối đa 5 MB</p>
              <input
                id="course-thumbnail"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  chooseThumbnail(event.target.files?.item(0) ?? null);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </div>
          </section>

          <section
            aria-labelledby="course-description-title"
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h3 id="course-description-title" className="text-sm font-semibold text-primary">
              Mô tả khóa học
            </h3>
            <label htmlFor="course-description" className="sr-only">
              Nội dung mô tả
            </label>
            <textarea
              id="course-description"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              required
              rows={10}
              className="focus-ring mt-3 w-full resize-y rounded-lg border border-slate-200 p-3 text-sm leading-6 text-slate-800"
            />
          </section>
        </div>

        <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <label htmlFor="course-price" className="block text-sm font-semibold text-primary">
              Giá khóa học
            </label>
            <div className="mt-2 flex min-h-11 items-center rounded-lg border border-slate-200 px-3">
              <input
                id="course-price"
                type="number"
                min="0"
                step="1000"
                value={form.price}
                onChange={(event) => updateField("price", Number(event.target.value))}
                className="focus-ring min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none"
              />
              <span className="text-sm font-semibold text-primary">VNĐ</span>
            </div>
          </div>
          <div>
            <label
              htmlFor="course-original-price"
              className="block text-sm font-semibold text-primary"
            >
              Giá gốc (tùy chọn)
            </label>
            <input
              id="course-original-price"
              type="number"
              min="0"
              step="1000"
              value={form.originalPrice ?? ""}
              onChange={(event) =>
                updateField(
                  "originalPrice",
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="course-language" className="block text-sm font-semibold text-primary">
              Ngôn ngữ
            </label>
            <input
              id="course-language"
              value={form.language}
              onChange={(event) => updateField("language", event.target.value)}
              maxLength={20}
              className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="course-level" className="block text-sm font-semibold text-primary">
              Trình độ
            </label>
            <select
              id="course-level"
              value={form.level}
              onChange={(event) =>
                updateField("level", event.target.value as InstructorCourseLevel)
              }
              className="focus-ring mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </aside>
      </div>
    </form>
  );
}

function getCourseActionError(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof TypeError && /fetch/i.test(cause.message)) {
    return "Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.";
  }
  return cause instanceof Error ? cause.message : fallback;
}
