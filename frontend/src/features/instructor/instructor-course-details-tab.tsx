"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, CircleAlert, ImagePlus, LoaderCircle, PlaySquare, X } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useInstructorCourseWorkspace } from "@/features/instructor/instructor-course-workspace";
import { ApiClientError } from "@/lib/api";
import { courseDescriptionToText } from "@/lib/course-description";
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
const languageOptions = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "ja", label: "Tiếng Nhật" },
  { value: "ko", label: "Tiếng Hàn" },
  { value: "zh", label: "Tiếng Trung" },
];
const subtitleLanguageOptions = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "ja", label: "Tiếng Nhật" },
  { value: "ko", label: "Tiếng Hàn" },
  { value: "zh", label: "Tiếng Trung" },
];
const allowedThumbnailTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type CourseForm = Omit<InstructorCoursePayload, "price" | "originalPrice" | "subtitleLanguages"> & {
  basePrice: string;
  discountEnabled: boolean;
  discountedPrice: string;
  subtitleLanguages: string[];
};

function getPriceDigits(value: string | number): string {
  return String(value).replace(/\D/g, "");
}

function formatPriceInput(value: string | number): string {
  const digits = getPriceDigits(value);
  return digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
}

function getPriceValue(value: string): number {
  return Number(getPriceDigits(value) || 0);
}

const numberWords = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const amountScales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];

function readThreeDigitGroup(value: number, includeLeadingHundreds: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const words: string[] = [];

  if (hundreds > 0) words.push(`${numberWords[hundreds]} trăm`);
  else if (includeLeadingHundreds && (tens > 0 || ones > 0)) words.push("không trăm");

  if (tens === 0) {
    if (ones > 0) {
      if (hundreds > 0 || includeLeadingHundreds) words.push("lẻ");
      words.push(numberWords[ones]);
    }
  } else if (tens === 1) {
    words.push("mười");
    if (ones > 0) words.push(ones === 5 ? "lăm" : numberWords[ones]);
  } else {
    words.push(`${numberWords[tens]} mươi`);
    if (ones > 0) {
      words.push(ones === 1 ? "mốt" : ones === 4 ? "tư" : ones === 5 ? "lăm" : numberWords[ones]);
    }
  }

  return words.join(" ");
}

function formatPriceInWords(value: string): string {
  let remaining = getPriceValue(value);
  if (remaining === 0 && !getPriceDigits(value)) return "";
  if (remaining === 0) return "Không đồng";

  const groups: Array<{ value: number; scale: string }> = [];
  let scaleIndex = 0;
  while (remaining > 0) {
    const group = remaining % 1000;
    if (group > 0) groups.push({ value: group, scale: amountScales[scaleIndex] ?? "" });
    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }

  const words = groups
    .reverse()
    .map((group, index) => {
      const groupWords = readThreeDigitGroup(group.value, index > 0);
      return [groupWords, group.scale].filter(Boolean).join(" ");
    })
    .join(" ");

  return `${words.charAt(0).toLocaleUpperCase("vi-VN")}${words.slice(1)} đồng`;
}

function toCourseForm(
  course: ReturnType<typeof useInstructorCourseWorkspace>["course"],
): CourseForm {
  const discountEnabled = course.originalPrice !== null && course.originalPrice > course.price;

  return {
    title: course.title,
    slug: course.slug,
    tagline: course.tagline ?? "",
    description: course.description ?? "",
    basePrice: formatPriceInput(discountEnabled ? course.originalPrice! : course.price),
    discountEnabled,
    discountedPrice: discountEnabled ? formatPriceInput(course.price) : "",
    level: course.level,
    language: course.language,
    subtitleLanguages: course.subtitleLanguages ?? [],
    thumbnailKey: course.thumbnailKey,
  };
}

export function InstructorCourseDetailsTab() {
  const { accessToken, course, setCourse } = useInstructorCourseWorkspace();
  const [form, setForm] = useState<CourseForm>(() => toCourseForm(course));
  const [subtitleMenuOpen, setSubtitleMenuOpen] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(course.thumbnailUrl);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const subtitlePickerRef = useRef<HTMLDivElement>(null);
  const subtitleTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setForm(toCourseForm(course));
    setSubtitleMenuOpen(false);
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

  useEffect(() => {
    if (!subtitleMenuOpen) return;

    function handleOutsideClick(event: MouseEvent | TouchEvent) {
      if (subtitlePickerRef.current && !subtitlePickerRef.current.contains(event.target as Node)) {
        setSubtitleMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSubtitleMenuOpen(false);
        subtitleTriggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [subtitleMenuOpen]);

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

  const getPayload = async (): Promise<InstructorCoursePayload> => {
    let thumbnailKey = form.thumbnailKey;
    if (thumbnailFile) {
      if (!accessToken) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const uploaded = await uploadCourseThumbnail(thumbnailFile, accessToken);
      thumbnailKey = uploaded.objectKey;
    }
    return {
      title: form.title.trim(),
      slug: form.slug,
      tagline: form.tagline?.trim() || null,
      description: form.description.trim(),
      price: form.discountEnabled
        ? getPriceValue(form.discountedPrice)
        : getPriceValue(form.basePrice),
      originalPrice: form.discountEnabled ? getPriceValue(form.basePrice) : null,
      thumbnailKey,
      level: form.level,
      language: form.language,
      subtitleLanguages: form.subtitleLanguages,
    };
  };

  const validate = () => {
    if (!form.title.trim() || !courseDescriptionToText(form.description)) {
      setError("Vui lòng nhập tên và mô tả khóa học.");
      return false;
    }
    if (form.discountEnabled) {
      const basePrice = getPriceValue(form.basePrice);
      const discountPrice = getPriceValue(form.discountedPrice);
      if (!getPriceDigits(form.discountedPrice) || discountPrice >= basePrice) {
        setError("Giá sau giảm phải nhỏ hơn giá khóa học.");
        return false;
      }
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
  const selectedSubtitleOptions = form.subtitleLanguages.map(
    (languageCode) =>
      subtitleLanguageOptions.find((option) => option.value === languageCode) ?? {
        value: languageCode,
        label: languageCode,
      },
  );

  const toggleSubtitleLanguage = (languageCode: string) => {
    const selected = form.subtitleLanguages.includes(languageCode);
    updateField(
      "subtitleLanguages",
      selected
        ? form.subtitleLanguages.filter((selectedCode) => selectedCode !== languageCode)
        : [...form.subtitleLanguages, languageCode],
    );
  };

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

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_334px]">
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
            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                chooseThumbnail(event.dataTransfer.files.item(0));
              }}
              className={`group relative mt-3 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-[#f8fafc] text-center transition-colors hover:border-primary hover:bg-primary-soft/30 ${
                thumbnailPreview ? "aspect-video overflow-hidden p-0" : "min-h-40 p-4"
              }`}
            >
              <input
                id="course-thumbnail"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  chooseThumbnail(event.target.files?.item(0) ?? null);
                  event.target.value = "";
                }}
                className="peer sr-only"
              />
              {thumbnailPreview ? (
                <>
                  {/* Thumbnail URLs come from API or a local preview URL. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailPreview}
                    alt="Xem trước ảnh bìa khóa học"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center bg-slate-950/10 opacity-0 transition-opacity group-hover:opacity-100 peer-focus-visible:opacity-100"
                  >
                    <ImagePlus className="h-12 w-12 rounded-full bg-white/90 p-3 text-primary shadow-sm" />
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-slate-500" aria-hidden="true" />
                  <p className="text-sm font-semibold text-heading">
                    Kéo thả vào đây hoặc{" "}
                    <span className="text-primary underline-offset-2 group-hover:underline">
                      Chọn tệp
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">JPEG, PNG hoặc WebP · tối đa 5 MB</p>
                </>
              )}
            </label>
          </section>

          <section
            aria-labelledby="course-description-title"
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <h3 id="course-description-title" className="text-sm font-semibold text-primary">
              Mô tả khóa học
            </h3>
            <RichTextEditor
              label="Nội dung mô tả khóa học"
              value={form.description}
              disabled={busy}
              onChange={(value) => updateField("description", value)}
            />
          </section>
        </div>

        <aside className="space-y-[6px] rounded-xl border border-slate-200 bg-white px-[18px] py-[15px]">
          <div>
            <label
              htmlFor="course-base-price"
              className="block text-[14px] font-semibold leading-[21px] text-[#079367]"
            >
              Giá khóa học
            </label>
            <div className="mt-[6px] flex h-[42px] items-center rounded-lg border border-[#e2e8f0] bg-white px-4 transition focus-within:border-[#079367] focus-within:ring-1 focus-within:ring-[#079367]/20">
              <input
                id="course-base-price"
                type="text"
                inputMode="numeric"
                value={form.basePrice}
                onFocus={() => updateField("basePrice", getPriceDigits(form.basePrice))}
                onChange={(event) =>
                  updateField("basePrice", event.target.value.replace(/\D/g, ""))
                }
                onBlur={() => updateField("basePrice", formatPriceInput(form.basePrice))}
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-[16px] font-medium leading-[26px] text-[#0f172a] outline-none"
              />
              <span className="text-[16px] font-medium leading-[26px] text-[#079367]">VNĐ</span>
            </div>
            <p className="mt-[6px] h-[19px] text-[11px] leading-[19px] text-[#90a1b9]">
              {formatPriceInWords(form.basePrice) || "\u00a0"}
            </p>
          </div>
          <div className="flex min-h-[39px] items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-5 text-[#079367]">Giảm giá</p>
              <p className="text-[11px] leading-[19px] text-[#90a1b9]">
                Khi bật tùy chọn này, khóa học sẽ được giảm giá
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Giảm giá"
              aria-checked={form.discountEnabled}
              disabled={busy}
              onClick={() => updateField("discountEnabled", !form.discountEnabled)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:brightness-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                form.discountEnabled ? "bg-primary" : "bg-[#e2e8f0]"
              }`}
            >
              <span
                className={`pointer-events-none absolute top-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)] transition-[left] ${form.discountEnabled ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </div>
          {form.discountEnabled ? (
            <div>
              <label htmlFor="course-discount-price" className="sr-only">
                Giá sau giảm
              </label>
              <div className="flex h-[42px] items-center rounded-lg border border-[#e2e8f0] bg-white px-4 transition focus-within:border-[#079367] focus-within:ring-1 focus-within:ring-[#079367]/20">
                <input
                  id="course-discount-price"
                  type="text"
                  inputMode="numeric"
                  value={form.discountedPrice}
                  onFocus={() =>
                    updateField("discountedPrice", getPriceDigits(form.discountedPrice))
                  }
                  onChange={(event) =>
                    updateField("discountedPrice", event.target.value.replace(/\D/g, ""))
                  }
                  onBlur={() =>
                    updateField("discountedPrice", formatPriceInput(form.discountedPrice))
                  }
                  className="h-full min-w-0 flex-1 border-0 bg-transparent text-[16px] font-medium leading-[26px] text-[#0f172a] outline-none"
                />
                <span className="text-[16px] font-medium leading-[26px] text-[#079367]">VNĐ</span>
              </div>
              <p className="mt-[6px] h-[19px] text-[11px] leading-[19px] text-[#90a1b9]">
                {formatPriceInWords(form.discountedPrice) || "\u00a0"}
              </p>
            </div>
          ) : null}
          <div>
            <label
              htmlFor="course-language"
              className="block text-[14px] font-semibold leading-[21px] text-[#079367]"
            >
              Ngôn ngữ
            </label>
            <CustomSelect
              id="course-language"
              value={form.language}
              onChange={(value) => updateField("language", value)}
              options={[
                ...(!languageOptions.some((option) => option.value === form.language)
                  ? [{ value: form.language, label: form.language }]
                  : []),
                ...languageOptions,
              ]}
              disabled={busy}
              aria-label="Ngôn ngữ"
              className="mt-[6px] w-full"
              buttonClassName="h-[42px] w-full rounded-lg border-[#e2e8f0] px-4 text-[16px] font-normal leading-[26px] shadow-none hover:border-slate-300"
              menuClassName="w-full rounded-lg border-[#e2e8f0]"
            />
          </div>
          <div ref={subtitlePickerRef}>
            <p
              id="course-subtitles-label"
              className="block text-[14px] font-semibold leading-[21px] text-[#079367]"
            >
              Phụ đề
            </p>
            <div className="relative mt-[6px]">
              <div
                onClick={() => setSubtitleMenuOpen((open) => !open)}
                role="group"
                aria-labelledby="course-subtitles-label"
                className="flex min-h-[42px] cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-white px-4 py-1 transition hover:border-slate-300"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {selectedSubtitleOptions.length > 0 ? (
                    selectedSubtitleOptions.map((option) => (
                      <span
                        key={option.value}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e2e8f0] bg-[#f1f5f9] pl-2 pr-1 text-[12px] font-semibold text-[#0f172a]"
                      >
                        <span>{option.label}</span>
                        <button
                          type="button"
                          aria-label={`Xóa phụ đề ${option.label}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSubtitleLanguage(option.value);
                          }}
                          className="focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#0f172a] transition hover:bg-slate-200"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[16px] text-[#64748b]">Chọn phụ đề</span>
                  )}
                </div>
                <button
                  ref={subtitleTriggerRef}
                  type="button"
                  aria-label="Chọn phụ đề"
                  aria-controls="course-subtitles-options"
                  aria-expanded={subtitleMenuOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSubtitleMenuOpen((open) => !open);
                  }}
                  className="focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#64748b]"
                >
                  <ChevronDown
                    className={`h-6 w-6 transition-transform ${subtitleMenuOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
              {subtitleMenuOpen ? (
                <div
                  id="course-subtitles-options"
                  role="group"
                  aria-labelledby="course-subtitles-label"
                  className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[#e2e8f0] bg-white p-1 shadow-lg"
                >
                  {subtitleLanguageOptions.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`subtitle-language-${option.value}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-[#0f172a] transition hover:bg-[#f1f5f9]"
                    >
                      <input
                        id={`subtitle-language-${option.value}`}
                        type="checkbox"
                        checked={form.subtitleLanguages.includes(option.value)}
                        onChange={() => toggleSubtitleLanguage(option.value)}
                        className="h-4 w-4 rounded accent-[#079367]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <label
              htmlFor="course-level"
              className="block text-[14px] font-semibold leading-[21px] text-[#079367]"
            >
              Trình độ
            </label>
            <CustomSelect
              id="course-level"
              value={form.level}
              onChange={(value) => updateField("level", value as InstructorCourseLevel)}
              options={levelOptions}
              disabled={busy}
              aria-label="Trình độ"
              className="mt-[6px] w-full"
              buttonClassName={`h-[42px] w-full rounded-lg border-[#e2e8f0] px-4 text-[16px] font-normal leading-[26px] shadow-none hover:border-slate-300 ${
                form.level === "ALL_LEVELS" ? "text-[#eab308]" : "text-[#0f172a]"
              }`}
              menuClassName="w-full rounded-lg border-[#e2e8f0]"
            />
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
