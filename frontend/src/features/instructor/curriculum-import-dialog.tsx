"use client";

import { AlertCircle, Check, FileUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import type { CustomSelectOption } from "@/components/ui/custom-select";
import { ApiClientError } from "@/lib/api";
import {
  applyCurriculumImport,
  createCurriculumImport,
  fetchCurriculumImport,
  fetchEducationPolicy,
} from "@/lib/curriculum-import-client";
import type {
  ApplyCurriculumImportResponse,
  CurriculumImportChapter,
  CurriculumImportJob,
  CurriculumImportLesson,
  EducationLevel,
  EducationPolicyResponse,
} from "@/types/curriculum-import";

type ImportPhase = "upload" | "processing" | "preview";
type EditableLesson = CurriculumImportLesson & { editorKey: string };
type EditableChapter = Omit<CurriculumImportChapter, "lessons"> & {
  editorKey: string;
  lessons: EditableLesson[];
};

type CurriculumImportDialogProps = {
  courseId: string;
  accessToken?: string | null;
  hasExistingChapters: boolean;
  onClose: () => void;
  onApplied: (result: ApplyCurriculumImportResponse) => Promise<void>;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_CHAPTERS = 20;
const MAX_LESSONS = 100;
const inputClassName =
  "focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-heading placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500";
const educationLevels: Array<{ value: EducationLevel; label: string }> = [
  { value: "PRIMARY", label: "Tiểu học" },
  { value: "LOWER_SECONDARY", label: "Trung học cơ sở" },
  { value: "UPPER_SECONDARY", label: "Trung học phổ thông" },
  { value: "HIGHER_EDUCATION", label: "Giáo dục đại học" },
  { value: "VOCATIONAL", label: "Giáo dục nghề nghiệp / cao đẳng nghề" },
  { value: "OTHER", label: "Khác / giáo dục thường xuyên" },
];
const gradeOptionsByLevel: Record<EducationLevel, CustomSelectOption[]> = {
  PRIMARY: Array.from({ length: 5 }, (_, index) => ({
    value: `Lớp ${index + 1}`,
    label: `Lớp ${index + 1}`,
  })),
  LOWER_SECONDARY: Array.from({ length: 4 }, (_, index) => ({
    value: `Lớp ${index + 6}`,
    label: `Lớp ${index + 6}`,
  })),
  UPPER_SECONDARY: Array.from({ length: 3 }, (_, index) => ({
    value: `Lớp ${index + 10}`,
    label: `Lớp ${index + 10}`,
  })),
  HIGHER_EDUCATION: Array.from({ length: 8 }, (_, index) => ({
    value: `Năm thứ ${index + 1}`,
    label: `Năm thứ ${index + 1}`,
  })),
  VOCATIONAL: Array.from({ length: 4 }, (_, index) => ({
    value: `Năm thứ ${index + 1}`,
    label: `Năm thứ ${index + 1}`,
  })),
  OTHER: [
    ...Array.from({ length: 12 }, (_, index) => ({
      value: `Lớp ${index + 1}`,
      label: `Lớp ${index + 1}`,
    })),
    { value: "Không phân lớp", label: "Không phân lớp" },
  ],
};
const subjectOptionsByLevel: Record<EducationLevel, CustomSelectOption[]> = {
  PRIMARY: [
    "Tiếng Việt",
    "Toán",
    "Đạo đức",
    "Tự nhiên và Xã hội",
    "Khoa học",
    "Lịch sử và Địa lí",
    "Tin học và Công nghệ",
    "Tiếng Anh",
    "Giáo dục thể chất",
    "Nghệ thuật",
    "Âm nhạc",
    "Mỹ thuật",
    "Hoạt động trải nghiệm",
  ].map((label) => ({ value: label, label })),
  LOWER_SECONDARY: [
    "Ngữ văn",
    "Toán",
    "Tiếng Anh",
    "Giáo dục công dân",
    "Lịch sử và Địa lí",
    "Khoa học tự nhiên",
    "Công nghệ",
    "Tin học",
    "Giáo dục thể chất",
    "Nghệ thuật",
    "Âm nhạc",
    "Mỹ thuật",
    "Hoạt động trải nghiệm, hướng nghiệp",
    "Giáo dục địa phương",
  ].map((label) => ({ value: label, label })),
  UPPER_SECONDARY: [
    "Ngữ văn",
    "Toán",
    "Tiếng Anh",
    "Lịch sử",
    "Địa lí",
    "Giáo dục kinh tế và pháp luật",
    "Vật lí",
    "Hóa học",
    "Sinh học",
    "Tin học",
    "Công nghệ",
    "Giáo dục thể chất",
    "Giáo dục quốc phòng và an ninh",
    "Âm nhạc",
    "Mỹ thuật",
    "Hoạt động trải nghiệm, hướng nghiệp",
    "Giáo dục địa phương",
  ].map((label) => ({ value: label, label })),
  HIGHER_EDUCATION: [
    "Ngôn ngữ Anh",
    "Công nghệ thông tin",
    "Khoa học máy tính",
    "Khoa học dữ liệu",
    "Kế toán",
    "Quản trị kinh doanh",
    "Marketing",
    "Kinh tế",
    "Luật",
    "Sư phạm",
    "Điều dưỡng",
    "Kỹ thuật điện",
    "Thiết kế đồ họa",
    "Lập trình",
    "Kỹ năng mềm",
  ].map((label) => ({ value: label, label })),
  VOCATIONAL: [
    "Điện công nghiệp",
    "Công nghệ ô tô",
    "Công nghệ thông tin",
    "Lập trình",
    "Kế toán",
    "Nghiệp vụ nhà hàng",
    "Nghiệp vụ khách sạn",
    "Chăm sóc sắc đẹp",
    "Kỹ năng mềm",
  ].map((label) => ({ value: label, label })),
  OTHER: ["Toán", "Ngữ văn", "Ngoại ngữ", "Tin học", "Kỹ năng mềm", "Giáo dục thường xuyên"].map(
    (label) => ({ value: label, label }),
  ),
};
const textbookOptions = [
  { value: "", label: "Không chọn bộ sách" },
  { value: "Kết nối tri thức với cuộc sống", label: "Kết nối tri thức với cuộc sống" },
  { value: "Chân trời sáng tạo", label: "Chân trời sáng tạo" },
  { value: "Cánh Diều", label: "Cánh Diều" },
  { value: "Chương trình GDPT 2018", label: "Chương trình GDPT 2018" },
];
const schoolYearOptions = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"].map((value) => ({
  value,
  label: value,
}));

function GeminiLoader() {
  return (
    <span className="gemini-loader" aria-hidden="true">
      <span className="gemini-loader__orbit">
        <span className="gemini-loader__position gemini-loader__position--top">
          <span className="gemini-loader__dot gemini-loader__dot--red" />
        </span>
        <span className="gemini-loader__position gemini-loader__position--right">
          <span className="gemini-loader__dot gemini-loader__dot--green" />
        </span>
        <span className="gemini-loader__position gemini-loader__position--bottom">
          <span className="gemini-loader__dot gemini-loader__dot--blue" />
        </span>
        <span className="gemini-loader__position gemini-loader__position--left">
          <span className="gemini-loader__dot gemini-loader__dot--yellow" />
        </span>
      </span>
    </span>
  );
}

function importErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 429) {
      return "Dịch vụ AI đang đạt hạn mức sử dụng. Vui lòng thử lại sau.";
    }
    if (error.status === 503) {
      return "Dịch vụ AI chưa sẵn sàng hoặc chưa được cấu hình. Vui lòng thử lại sau.";
    }
    if (error.status === 413)
      return "Tệp vượt quá dung lượng cho phép. Vui lòng chọn tệp tối đa 5 MB.";
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 403) return "Bạn không có quyền nhập giáo trình cho khóa học này.";
    if (error.status === 0) {
      return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng rồi thử lại.";
    }
    return error.message;
  }
  return "Không thể xử lý kế hoạch bài dạy. Vui lòng thử lại.";
}

function waitForNextPoll(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Request aborted", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, 1000);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

function editableChapters(job: CurriculumImportJob): EditableChapter[] {
  return (job.preview?.chapters ?? []).map((chapter, chapterIndex) => ({
    editorKey: `${job.id}-chapter-${chapterIndex}`,
    title: chapter.title ?? "",
    introduction: chapter.introduction ?? "",
    description: chapter.description ?? "",
    lessons: (chapter.lessons ?? []).map((lesson, lessonIndex) => ({
      editorKey: `${job.id}-chapter-${chapterIndex}-lesson-${lessonIndex}`,
      title: lesson.title ?? "",
      introduction: lesson.introduction ?? "",
      description: lesson.description ?? "",
      objectives: lesson.objectives ?? [],
      durationMinutes: lesson.durationMinutes ?? 0,
    })),
  }));
}

function previewValidation(chapters: EditableChapter[]): string | null {
  if (chapters.length === 0) return "Cần giữ lại ít nhất một chương để thêm vào giáo trình.";
  if (chapters.length > MAX_CHAPTERS) return "Mỗi lần nhập chỉ hỗ trợ tối đa 20 chương.";
  if (chapters.reduce((total, chapter) => total + chapter.lessons.length, 0) > MAX_LESSONS) {
    return "Mỗi lần nhập chỉ hỗ trợ tối đa 100 bài học.";
  }
  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
    const chapter = chapters[chapterIndex];
    if (!chapter.title.trim()) return `Vui lòng nhập tên chương ${chapterIndex + 1}.`;
    if (chapter.title.length > 255) return `Tên chương ${chapterIndex + 1} vượt quá 255 ký tự.`;
    if (chapter.introduction.length > 500)
      return `Giới thiệu chương ${chapterIndex + 1} vượt quá 500 ký tự.`;
    if (chapter.description.length > 20000)
      return `Mô tả chương ${chapterIndex + 1} vượt quá 20.000 ký tự.`;
    if (chapter.lessons.length === 0) return `Chương ${chapterIndex + 1} cần ít nhất một bài học.`;
    for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex += 1) {
      const lesson = chapter.lessons[lessonIndex];
      const position = `${chapterIndex + 1}.${lessonIndex + 1}`;
      if (!lesson.title.trim()) return `Vui lòng nhập tên bài ${position}.`;
      if (lesson.title.length > 255) return `Tên bài ${position} vượt quá 255 ký tự.`;
      if (lesson.introduction.length > 500) return `Giới thiệu bài ${position} vượt quá 500 ký tự.`;
      if (lesson.description.length > 20000) return `Mô tả bài ${position} vượt quá 20.000 ký tự.`;
      if (
        lesson.objectives.length > 10 ||
        lesson.objectives.some((objective) => objective.length > 300)
      ) {
        return `Mục tiêu bài ${position} vượt quá giới hạn cho phép.`;
      }
      if (
        !Number.isInteger(lesson.durationMinutes) ||
        lesson.durationMinutes < 0 ||
        lesson.durationMinutes > 600
      ) {
        return `Thời lượng bài ${position} phải là số phút nguyên từ 0 đến 600.`;
      }
    }
  }
  const totalCharacters = chapters.reduce(
    (total, chapter) =>
      total +
      chapter.title.length +
      chapter.introduction.length +
      chapter.description.length +
      chapter.lessons.reduce(
        (lessonTotal, lesson) =>
          lessonTotal +
          lesson.title.length +
          lesson.introduction.length +
          lesson.description.length +
          lesson.objectives.reduce(
            (objectiveTotal, objective) => objectiveTotal + objective.length,
            0,
          ),
        0,
      ),
    0,
  );
  if (totalCharacters > 100000)
    return "Mỗi lần nhập tối đa 100.000 ký tự. Hãy bỏ bớt nội dung hoặc chia nhỏ giáo trình.";
  return null;
}

export function CurriculumImportDialog({
  courseId,
  accessToken,
  hasExistingChapters,
  onClose,
  onApplied,
}: CurriculumImportDialogProps) {
  const [phase, setPhase] = useState<ImportPhase>("upload");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [schoolYear, setSchoolYear] = useState("2026-2027");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<CurriculumImportJob | null>(null);
  const [chapters, setChapters] = useState<EditableChapter[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [policyState, setPolicyState] = useState<{
    contextKey: string;
    data: EducationPolicyResponse | null;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const operationRef = useRef(0);
  const applyingRef = useRef(false);
  const lessonCount = chapters.reduce((total, chapter) => total + chapter.lessons.length, 0);
  const policyContextKey = JSON.stringify([
    educationLevel,
    subject.trim(),
    grade.trim(),
    schoolYear.trim(),
  ]);
  const usesSchoolTextbookOptions =
    educationLevel === "PRIMARY" ||
    educationLevel === "LOWER_SECONDARY" ||
    educationLevel === "UPPER_SECONDARY";
  const hasTrainingYear = educationLevel === "HIGHER_EDUCATION" || educationLevel === "VOCATIONAL";
  const hasPolicyContext = Boolean(educationLevel && subject.trim());
  const policyMatchesContext = policyState?.contextKey === policyContextKey;
  const policyLoading = hasPolicyContext && (!policyMatchesContext || policyState?.loading);
  const educationPolicy = policyMatchesContext ? policyState?.data : null;

  useEffect(() => {
    if (phase !== "upload" || !educationLevel || !subject.trim()) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setPolicyState({ contextKey: policyContextKey, data: null, loading: true, error: null });
      void fetchEducationPolicy(
        { educationLevel, subject, grade, schoolYear },
        accessToken,
        controller.signal,
      )
        .then((data) => {
          if (!controller.signal.aborted)
            setPolicyState({ contextKey: policyContextKey, data, loading: false, error: null });
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted)
            setPolicyState({
              contextKey: policyContextKey,
              data: null,
              loading: false,
              error:
                cause instanceof ApiClientError
                  ? cause.message
                  : "Chưa tải được nguồn tham chiếu. Vui lòng kiểm tra mạng hoặc thử lại sau.",
            });
        });
    }, 600);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [accessToken, educationLevel, grade, phase, policyContextKey, schoolYear, subject]);

  const dismiss = useCallback(() => {
    if (!applyingRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialogRef.current.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [dismiss]);

  useEffect(
    () => () => {
      operationRef.current += 1;
      controllerRef.current?.abort();
    },
    [],
  );

  const selectFile = (selected: File | null) => {
    setError(null);
    if (selected && !/\.(doc|docx|pdf)$/i.test(selected.name)) {
      setFile(null);
      setError("Vui lòng chọn tệp Word (.doc, .docx) hoặc PDF (.pdf).");
      return;
    }
    if (selected && (selected.size > MAX_FILE_BYTES || selected.size === 0)) {
      setFile(null);
      setError("Tệp phải có nội dung và dung lượng tối đa 5 MB.");
      return;
    }
    setFile(selected);
  };

  const analyze = async (existingJob: CurriculumImportJob | null = null) => {
    if (
      !existingJob &&
      (!/^\d{4}-\d{4}$/.test(schoolYear.trim()) ||
        Number(schoolYear.slice(5)) !== Number(schoolYear.slice(0, 4)) + 1)
    ) {
      setError("Năm học cần có hai năm liên tiếp, ví dụ 2026-2027.");
      return;
    }
    if (!existingJob && (!file || !educationLevel || !subject.trim())) {
      setError("Vui lòng chọn cấp học, nhập môn học và chọn tệp trước khi phân tích.");
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const operation = ++operationRef.current;
    const isCurrent = () => operationRef.current === operation;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 180000);
    let currentJob = existingJob;
    setPhase("processing");
    setWaiting(true);
    setError(null);

    try {
      if (!currentJob && file && educationLevel) {
        currentJob = await createCurriculumImport(
          courseId,
          { file, educationLevel, subject, grade, curriculum, schoolYear },
          accessToken,
          controller.signal,
        );
      }
      if (!currentJob || !isCurrent()) return;
      setJob(currentJob);
      while (currentJob.status === "QUEUED" || currentJob.status === "PROCESSING") {
        await waitForNextPoll(controller.signal);
        currentJob = await fetchCurriculumImport(
          courseId,
          currentJob.id,
          accessToken,
          controller.signal,
        );
        if (!isCurrent()) return;
        setJob(currentJob);
      }
      if (controller.signal.aborted || !isCurrent()) return;
      if (currentJob.status === "FAILED") {
        setError(
          currentJob.message ||
            "Không thể phân tích tài liệu. Vui lòng kiểm tra nội dung rồi thử lại.",
        );
        setJob(null);
        setPhase("upload");
        return;
      }
      if (currentJob.status === "APPLIED") {
        setError(
          "Bản nhập này đã được thêm vào giáo trình. Vui lòng đóng cửa sổ và tải lại trang.",
        );
        return;
      }
      if (currentJob.status !== "COMPLETED" || !currentJob.preview?.chapters?.length) {
        setError(
          "Không tìm thấy chương hoặc bài học trong tài liệu. Vui lòng chọn kế hoạch có nội dung rõ ràng.",
        );
        setJob(null);
        setPhase("upload");
        return;
      }
      setChapters(editableChapters(currentJob));
      setWarnings(currentJob.preview.warnings ?? []);
      setPhase("preview");
    } catch (caught) {
      if (!isCurrent()) return;
      if (controller.signal.aborted && !timedOut) return;
      setError(
        timedOut
          ? "Phân tích đang mất nhiều thời gian. Bạn có thể kiểm tra kết quả tiếp mà không cần tải lại tệp."
          : importErrorMessage(caught),
      );
      if (!currentJob) setPhase("upload");
    } finally {
      window.clearTimeout(timeout);
      if (isCurrent()) setWaiting(false);
    }
  };

  const stopWaiting = () => {
    operationRef.current += 1;
    controllerRef.current?.abort();
    setWaiting(false);
    if (job) {
      setError("Đã dừng chờ. Bạn có thể tiếp tục kiểm tra kết quả của tài liệu này.");
    } else {
      setPhase("upload");
      setError("Đã dừng chờ tải tệp. Giáo trình chưa được thay đổi.");
    }
  };

  const changeChapter = (key: string, patch: Partial<CurriculumImportChapter>) => {
    setChapters((previous) =>
      previous.map((chapter) =>
        chapter.editorKey === key ? { ...chapter, ...patch, lessons: chapter.lessons } : chapter,
      ),
    );
    setError(null);
  };

  const changeLesson = (
    chapterKey: string,
    lessonKey: string,
    patch: Partial<CurriculumImportLesson>,
  ) => {
    setChapters((previous) =>
      previous.map((chapter) =>
        chapter.editorKey === chapterKey
          ? {
              ...chapter,
              lessons: chapter.lessons.map((lesson) =>
                lesson.editorKey === lessonKey ? { ...lesson, ...patch } : lesson,
              ),
            }
          : chapter,
      ),
    );
    setError(null);
  };

  const apply = async () => {
    if (applyingRef.current || !job) return;
    const validation = previewValidation(chapters);
    if (validation) {
      setError(validation);
      return;
    }
    applyingRef.current = true;
    const operation = ++operationRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 45000);
    setApplying(true);
    setError(null);
    try {
      const payload = chapters.map((chapter) => ({
        title: chapter.title.trim(),
        introduction: chapter.introduction.trim(),
        description: chapter.description.trim(),
        lessons: chapter.lessons.map((lesson) => ({
          title: lesson.title.trim(),
          introduction: lesson.introduction.trim(),
          description: lesson.description.trim(),
          objectives: lesson.objectives.map((objective) => objective.trim()).filter(Boolean),
          durationMinutes: lesson.durationMinutes,
        })),
      }));
      const result = await applyCurriculumImport(
        courseId,
        job.id,
        payload,
        accessToken,
        controller.signal,
      );
      if (operationRef.current !== operation) return;
      await onApplied(result);
    } catch (caught) {
      if (operationRef.current === operation) {
        setError(
          controller.signal.aborted
            ? "Máy chủ chưa xác nhận kết quả lưu. Vui lòng tải lại giáo trình hoặc thử lại yêu cầu này."
            : importErrorMessage(caught),
        );
      }
    } finally {
      window.clearTimeout(timeout);
      applyingRef.current = false;
      if (operationRef.current === operation) setApplying(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) dismiss();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="curriculum-import-title"
        aria-describedby="curriculum-import-description"
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div>
            <h2 id="curriculum-import-title" className="text-lg font-semibold text-heading">
              Nhập kế hoạch bài dạy
            </h2>
            <p id="curriculum-import-description" className="mt-1 text-sm text-muted">
              AI gợi ý chương và bài học từ tài liệu. Bạn rà soát trước khi thêm vào giáo trình.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={dismiss}
            disabled={applying}
            aria-label="Đóng nhập kế hoạch bài dạy"
            className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <ol
          aria-label="Các bước nhập giáo trình"
          className="grid grid-cols-3 gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-xs sm:px-6 sm:text-sm"
        >
          {[
            { id: "upload", label: "Chọn tài liệu" },
            { id: "processing", label: "Phân tích" },
            { id: "preview", label: "Rà soát và lưu" },
          ].map((step, index) => (
            <li
              key={step.id}
              aria-current={phase === step.id ? "step" : undefined}
              className={`flex items-center gap-2 ${phase === step.id ? "font-semibold text-primary" : "text-muted"}`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${phase === step.id ? "bg-primary text-white" : "bg-slate-200/70 text-slate-600"}`}
              >
                {index + 1}
              </span>
              {step.label}
            </li>
          ))}
        </ol>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {error ? (
            <div
              role="alert"
              className="mb-4 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          {phase === "upload" ? (
            <form
              id="curriculum-import-upload"
              onSubmit={(event) => {
                event.preventDefault();
                void analyze();
              }}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="import-education-level"
                    className="text-sm font-medium text-heading"
                  >
                    Cấp học <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    id="import-education-level"
                    value={educationLevel}
                    onChange={(value) => {
                      setEducationLevel(value as EducationLevel | "");
                      setSubject("");
                      setGrade("");
                      setCurriculum("");
                    }}
                    options={educationLevels}
                    placeholder="Chọn cấp học"
                    aria-label="Cấp học"
                    required
                    portal
                    className="w-full"
                    buttonClassName="h-[42px] w-full rounded-lg border-slate-200 px-3 py-2.5 text-sm font-normal shadow-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="import-subject" className="text-sm font-medium text-heading">
                    Môn học <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    id="import-subject"
                    value={subject}
                    onChange={setSubject}
                    options={educationLevel ? subjectOptionsByLevel[educationLevel] : []}
                    placeholder={educationLevel ? "Chọn hoặc nhập môn học" : "Chọn cấp học trước"}
                    aria-label="Môn học"
                    required
                    disabled={!educationLevel}
                    allowCustomValue
                    maxLength={120}
                    portal
                    className="w-full"
                    inputClassName={`${inputClassName} pr-10`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="import-grade" className="text-sm font-medium text-heading">
                    {hasTrainingYear ? "Năm đào tạo" : "Lớp / khối"}{" "}
                    <span className="text-xs font-normal text-muted">(tùy chọn)</span>
                  </label>
                  <CustomSelect
                    id="import-grade"
                    value={grade}
                    onChange={setGrade}
                    options={
                      educationLevel
                        ? [
                            {
                              value: "",
                              label: hasTrainingYear
                                ? "Không chọn năm đào tạo"
                                : "Không chọn lớp / khối",
                            },
                            ...gradeOptionsByLevel[educationLevel],
                          ]
                        : []
                    }
                    placeholder={
                      educationLevel
                        ? hasTrainingYear
                          ? "Chọn năm đào tạo"
                          : "Chọn lớp / khối"
                        : "Chọn cấp học trước"
                    }
                    aria-label={hasTrainingYear ? "Năm đào tạo" : "Lớp hoặc khối"}
                    disabled={!educationLevel}
                    portal
                    className="w-full"
                    buttonClassName="h-[42px] w-full rounded-lg border-slate-200 px-3 py-2.5 text-sm font-normal shadow-none"
                  />
                </div>
                {educationLevel ? (
                  <div className="space-y-1.5">
                    <label htmlFor="import-curriculum" className="text-sm font-medium text-heading">
                      {usesSchoolTextbookOptions
                        ? "Bộ sách / tài liệu tham khảo"
                        : educationLevel === "HIGHER_EDUCATION"
                          ? "Chương trình đào tạo / tài liệu tham khảo"
                          : "Chương trình / tài liệu tham khảo"}{" "}
                      <span className="text-xs font-normal text-muted">(tùy chọn)</span>
                    </label>
                    {usesSchoolTextbookOptions ? (
                      <CustomSelect
                        id="import-curriculum"
                        value={curriculum}
                        onChange={setCurriculum}
                        options={textbookOptions}
                        placeholder="Có thể bỏ trống"
                        aria-label="Bộ sách hoặc tài liệu tham khảo"
                        allowCustomValue
                        maxLength={255}
                        portal
                        className="w-full"
                        inputClassName={`${inputClassName} pr-10`}
                      />
                    ) : (
                      <input
                        id="import-curriculum"
                        value={curriculum}
                        onChange={(event) => setCurriculum(event.target.value)}
                        maxLength={255}
                        placeholder={
                          educationLevel === "HIGHER_EDUCATION"
                            ? "Ví dụ: chương trình đào tạo ngành..."
                            : "Nhập chương trình hoặc tài liệu liên quan"
                        }
                        aria-label="Chương trình hoặc tài liệu tham khảo"
                        className={inputClassName}
                      />
                    )}
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <label htmlFor="import-school-year" className="text-sm font-medium text-heading">
                    Năm học
                  </label>
                  <CustomSelect
                    id="import-school-year"
                    value={schoolYear}
                    onChange={setSchoolYear}
                    options={schoolYearOptions}
                    placeholder="2026-2027"
                    aria-label="Năm học"
                    aria-describedby="import-school-year-hint"
                    allowCustomValue
                    required
                    maxLength={9}
                    pattern="[0-9]{4}-[0-9]{4}"
                    portal
                    className="w-full"
                    inputClassName={`${inputClassName} pr-10`}
                  />
                  <p id="import-school-year-hint" className="text-xs leading-5 text-muted">
                    Nguồn tham chiếu có thể khác nhau giữa các năm học.
                  </p>
                </div>
              </div>

              <section
                aria-label="Nguồn tham chiếu kế hoạch bài dạy"
                aria-busy={Boolean(policyLoading)}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
              >
                <h3 className="text-sm font-semibold text-heading">
                  Nguồn tham chiếu theo cấp học và môn học
                </h3>
                {!hasPolicyContext ? (
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Chọn cấp học và nhập môn học để xem các văn bản tham chiếu. Lớp/năm đào tạo và
                    năm học giúp xác định phạm vi áp dụng; tên bộ sách hoặc tài liệu không thay đổi
                    văn bản được chọn.
                  </p>
                ) : null}
                {policyLoading ? (
                  <p role="status" className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Đang tải nguồn tham chiếu...
                  </p>
                ) : null}
                {policyMatchesContext && policyState?.error ? (
                  <p role="status" className="mt-2 text-xs text-amber-800">
                    {policyState.error}
                  </p>
                ) : null}
                {educationPolicy ? (
                  <>
                    {educationPolicy.references.length > 0 ? (
                      <ul className="mt-2 space-y-2 text-xs leading-5">
                        {educationPolicy.references.map((reference) => (
                          <li key={`${reference.code}-${reference.url}`}>
                            <a
                              href={/^https?:\/\//i.test(reference.url) ? reference.url : undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="focus-ring rounded-sm font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
                            >
                              {reference.code ? `${reference.code} · ` : ""}
                              {reference.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted">
                        Chưa có nguồn tham chiếu phù hợp cho lựa chọn này.
                      </p>
                    )}
                    {educationPolicy.notes.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-5 text-muted">
                        {educationPolicy.notes.map((note, index) => (
                          <li key={`${index}-${note}`}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                    {educationPolicy.verifiedAt ? (
                      <p className="mt-3 text-[11px] text-muted">
                        Nguồn được cập nhật: {educationPolicy.verifiedAt}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </section>

              <div className="space-y-2">
                <label htmlFor="import-document" className="block text-sm font-medium text-heading">
                  Kế hoạch bài dạy <span className="text-rose-500">*</span>
                </label>
                <div
                  className="rounded-lg border border-dashed border-slate-300 bg-[#F5FBF9] p-5"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    selectFile(event.dataTransfer.files[0] ?? null);
                  }}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <FileUp className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-heading">
                        Kéo thả hoặc chọn tài liệu
                      </p>
                      <p id="import-document-hint" className="mt-0.5 text-xs text-muted">
                        Word (.doc, .docx) hoặc PDF, tối đa 5 MB. PDF cần có chữ có thể chọn và sao
                        chép.
                      </p>
                    </div>
                  </div>
                  <input
                    id="import-document"
                    type="file"
                    accept=".doc,.docx,.pdf,application/msword,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    aria-describedby="import-document-hint"
                    onChange={(event) => {
                      selectFile(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                    className="focus-ring block w-full rounded-lg text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-4 file:py-2 file:font-semibold file:text-primary hover:file:bg-emerald-100"
                  />
                  {file ? (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-white p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-heading">{file.name}</p>
                        <p className="text-xs text-muted">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => selectFile(null)}
                        aria-label="Bỏ tài liệu đã chọn"
                        className="focus-ring rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <p className="text-xs leading-5 text-muted">
                Hệ thống hỗ trợ chuẩn hóa nội dung trong tài liệu; giảng viên cần kiểm tra lại cấu
                trúc, nội dung và yêu cầu của mẫu kế hoạch đang áp dụng.
              </p>
            </form>
          ) : null}

          {phase === "processing" ? (
            <div
              className="flex min-h-[320px] flex-col items-center justify-center px-2 py-8 text-center"
              aria-live="polite"
              aria-busy={waiting}
            >
              {waiting ? (
                <GeminiLoader />
              ) : (
                <FileUp className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
              )}
              <h3 className="text-base font-semibold text-heading">
                {waiting && job ? (
                  <>
                    Đang phân tích kế hoạch bài dạy
                    <span className="analysis-ellipsis" aria-hidden="true" />
                  </>
                ) : waiting ? (
                  "Đang tải tài liệu lên..."
                ) : (
                  "Chờ kết quả phân tích"
                )}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                {waiting
                  ? "Hệ thống đang nhận diện chương, bài học và nội dung. Tài liệu dài có thể cần vài phút."
                  : "Bạn có thể kiểm tra lại kết quả hoặc chọn tài liệu khác."}
              </p>
              <p className="mt-4 text-xs text-muted">
                Giáo trình chỉ được cập nhật sau khi bạn rà soát và xác nhận.
              </p>
              {!waiting && job && job.status !== "APPLIED" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 rounded-lg"
                  onClick={() => void analyze(job)}
                >
                  Tiếp tục kiểm tra kết quả
                </Button>
              ) : null}
            </div>
          ) : null}

          {phase === "preview" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-100 bg-[#F5FBF9] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-heading">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  Nhận diện {chapters.length} chương · {lessonCount} bài học
                </p>
                <p className="mt-1 text-sm text-muted">
                  Bạn có thể sửa nội dung và bỏ những mục không phù hợp. Các bài học được lưu ở
                  trạng thái bản nháp.
                </p>
                {hasExistingChapters ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Chương mới được thêm vào cuối giáo trình hiện có.
                  </p>
                ) : null}
              </div>
              {warnings.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-900">Những điểm cần kiểm tra</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-800">
                    {warnings.map((warning, index) => (
                      <li key={`${index}-${warning}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {chapters.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-muted">
                  Bạn đã bỏ tất cả chương. Hãy phân tích lại tài liệu để tạo bản xem trước mới.
                </p>
              ) : null}
              <fieldset disabled={applying} className="space-y-4">
                {chapters.map((chapter, chapterIndex) => (
                  <article
                    key={chapter.editorKey}
                    className="overflow-hidden rounded-lg border border-slate-200"
                  >
                    <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <h3 className="text-sm font-semibold text-heading">
                        Chương {chapterIndex + 1} · {chapter.lessons.length} bài học
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setChapters((previous) =>
                            previous.filter((item) => item.editorKey !== chapter.editorKey),
                          );
                          setError(null);
                        }}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 disabled:opacity-50"
                        aria-label={`Bỏ chương ${chapterIndex + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Bỏ chương
                      </button>
                    </header>
                    <div className="space-y-4 p-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`${chapter.editorKey}-title`}
                          className="text-sm font-medium text-heading"
                        >
                          Tên chương <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id={`${chapter.editorKey}-title`}
                          value={chapter.title}
                          maxLength={255}
                          onChange={(event) =>
                            changeChapter(chapter.editorKey, { title: event.target.value })
                          }
                          className={inputClassName}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`${chapter.editorKey}-introduction`}
                          className="text-sm font-medium text-heading"
                        >
                          Giới thiệu chương
                        </label>
                        <textarea
                          id={`${chapter.editorKey}-introduction`}
                          value={chapter.introduction}
                          maxLength={500}
                          rows={2}
                          onChange={(event) =>
                            changeChapter(chapter.editorKey, { introduction: event.target.value })
                          }
                          className={inputClassName}
                        />
                      </div>
                      <details className="rounded-lg border border-slate-100">
                        <summary className="focus-ring cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-primary">
                          Mô tả chương
                        </summary>
                        <div className="p-3 pt-0">
                          <label htmlFor={`${chapter.editorKey}-description`} className="sr-only">
                            Mô tả chương {chapterIndex + 1}
                          </label>
                          <textarea
                            id={`${chapter.editorKey}-description`}
                            value={chapter.description}
                            maxLength={20000}
                            rows={4}
                            onChange={(event) =>
                              changeChapter(chapter.editorKey, { description: event.target.value })
                            }
                            className={inputClassName}
                          />
                        </div>
                      </details>
                      {chapter.lessons.map((lesson, lessonIndex) => (
                        <details
                          key={lesson.editorKey}
                          className="group rounded-lg border border-slate-200 bg-white"
                          open={chapterIndex === 0 && lessonIndex === 0 ? true : undefined}
                        >
                          <summary className="focus-ring cursor-pointer rounded-lg px-3 py-3 text-sm font-medium text-heading">
                            <span className="mr-2 text-xs text-muted">
                              {chapterIndex + 1}.{lessonIndex + 1}
                            </span>
                            {lesson.title || "Bài học chưa có tên"}
                            <span className="ml-2 text-xs font-normal text-muted">Bản nháp</span>
                          </summary>
                          <div className="space-y-3 border-t border-slate-100 p-3 sm:p-4">
                            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`${lesson.editorKey}-title`}
                                  className="text-sm font-medium text-heading"
                                >
                                  Tên bài học <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  id={`${lesson.editorKey}-title`}
                                  value={lesson.title}
                                  maxLength={255}
                                  onChange={(event) =>
                                    changeLesson(chapter.editorKey, lesson.editorKey, {
                                      title: event.target.value,
                                    })
                                  }
                                  className={inputClassName}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`${lesson.editorKey}-duration`}
                                  className="text-sm font-medium text-heading"
                                >
                                  Thời lượng ước tính (phút)
                                </label>
                                <input
                                  id={`${lesson.editorKey}-duration`}
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={lesson.durationMinutes}
                                  onChange={(event) =>
                                    changeLesson(chapter.editorKey, lesson.editorKey, {
                                      durationMinutes: Number(event.target.value),
                                    })
                                  }
                                  className={inputClassName}
                                />
                                <p className="text-[11px] text-muted">0 khi chưa xác định</p>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label
                                htmlFor={`${lesson.editorKey}-introduction`}
                                className="text-sm font-medium text-heading"
                              >
                                Giới thiệu
                              </label>
                              <textarea
                                id={`${lesson.editorKey}-introduction`}
                                value={lesson.introduction}
                                maxLength={500}
                                rows={2}
                                onChange={(event) =>
                                  changeLesson(chapter.editorKey, lesson.editorKey, {
                                    introduction: event.target.value,
                                  })
                                }
                                className={inputClassName}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label
                                htmlFor={`${lesson.editorKey}-description`}
                                className="text-sm font-medium text-heading"
                              >
                                Mô tả
                              </label>
                              <textarea
                                id={`${lesson.editorKey}-description`}
                                value={lesson.description}
                                maxLength={20000}
                                rows={5}
                                onChange={(event) =>
                                  changeLesson(chapter.editorKey, lesson.editorKey, {
                                    description: event.target.value,
                                  })
                                }
                                className={inputClassName}
                              />
                            </div>
                            <fieldset className="space-y-2">
                              <legend className="text-sm font-medium text-heading">
                                Mục tiêu bài học
                              </legend>
                              {lesson.objectives.map((objective, objectiveIndex) => (
                                <div
                                  key={`${lesson.editorKey}-objective-${objectiveIndex}`}
                                  className="flex items-center gap-2"
                                >
                                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                                    {objectiveIndex + 1}
                                  </span>
                                  <input
                                    aria-label={`Mục tiêu ${objectiveIndex + 1} của bài ${chapterIndex + 1}.${lessonIndex + 1}`}
                                    value={objective}
                                    maxLength={300}
                                    onChange={(event) =>
                                      changeLesson(chapter.editorKey, lesson.editorKey, {
                                        objectives: lesson.objectives.map((value, index) =>
                                          index === objectiveIndex ? event.target.value : value,
                                        ),
                                      })
                                    }
                                    className={inputClassName}
                                  />
                                  <button
                                    type="button"
                                    aria-label={`Bỏ mục tiêu ${objectiveIndex + 1}`}
                                    onClick={() =>
                                      changeLesson(chapter.editorKey, lesson.editorKey, {
                                        objectives: lesson.objectives.filter(
                                          (_, index) => index !== objectiveIndex,
                                        ),
                                      })
                                    }
                                    className="focus-ring rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                disabled={lesson.objectives.length >= 10}
                                onClick={() =>
                                  changeLesson(chapter.editorKey, lesson.editorKey, {
                                    objectives: [...lesson.objectives, ""],
                                  })
                                }
                                className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary disabled:opacity-50"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                Thêm mục tiêu
                              </button>
                            </fieldset>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setChapters((previous) =>
                                    previous.map((item) =>
                                      item.editorKey === chapter.editorKey
                                        ? {
                                            ...item,
                                            lessons: item.lessons.filter(
                                              (draft) => draft.editorKey !== lesson.editorKey,
                                            ),
                                          }
                                        : item,
                                    ),
                                  );
                                  setError(null);
                                }}
                                aria-label={`Bỏ bài ${chapterIndex + 1}.${lessonIndex + 1}`}
                                className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Bỏ bài học
                              </button>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  </article>
                ))}
              </fieldset>
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {phase === "upload" ? (
            <>
              <Button type="button" variant="ghost" className="rounded-lg" onClick={dismiss}>
                Hủy
              </Button>
              <Button
                type="submit"
                form="curriculum-import-upload"
                disabled={!file || !educationLevel || !subject.trim()}
                className="rounded-lg"
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                Phân tích tài liệu
              </Button>
            </>
          ) : null}
          {phase === "processing" ? (
            <>
              <Button type="button" variant="ghost" className="rounded-lg" onClick={dismiss}>
                Đóng
              </Button>
              {waiting ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  onClick={stopWaiting}
                >
                  Dừng chờ
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => {
                    setJob(null);
                    setError(null);
                    setPhase("upload");
                  }}
                >
                  Chọn lại tài liệu
                </Button>
              )}
            </>
          ) : null}
          {phase === "preview" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={applying}
                className="rounded-lg"
                onClick={() => {
                  setJob(null);
                  setError(null);
                  setPhase("upload");
                }}
              >
                Chọn lại tài liệu
              </Button>
              <Button
                type="button"
                loading={applying}
                disabled={
                  chapters.length === 0 ||
                  chapters.length > MAX_CHAPTERS ||
                  lessonCount > MAX_LESSONS
                }
                className="rounded-lg"
                onClick={() => void apply()}
              >
                {applying ? "Đang thêm giáo trình..." : "Thêm vào giáo trình"}
              </Button>
            </>
          ) : null}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
