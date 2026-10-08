"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileCode,
  FileQuestion,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { FeedbackModal, type FeedbackTone } from "@/components/ui/feedback-modal";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CourseCurriculumSectionsSkeleton, Skeleton } from "@/components/ui/skeleton";
import { CourseCurriculumSection } from "@/features/course/course-curriculum-section";
import type { CourseCurriculumSectionData } from "@/features/course/course-curriculum-section";
import { useAuth } from "@/features/auth/auth-client";
import {
  InstructorWorkspaceSidebar,
  useInstructorWorkspaceSidebar,
} from "@/features/instructor/instructor-workspace-shell";
import { ApiClientError } from "@/lib/api";
import {
  createLesson,
  createSection,
  deleteLesson,
  deleteSection,
  fetchCourseStructure,
  reorderLessons,
  reorderSections,
  updateLesson,
  updateSection,
} from "@/lib/course-structure-client";
import { uploadLessonVideo } from "@/lib/course-video-client";
import { courseDescriptionToText } from "@/lib/course-description";
import {
  createInstructorQuiz,
  type CreateInstructorQuizRequest,
} from "@/lib/instructor-quiz-client";
import {
  createQuizDraftQuestion,
  QuizAuthoringFields,
  type QuizDraftQuestion,
} from "@/features/instructor/quiz-authoring-fields";
import type {
  CourseStructure,
  CourseStructureSection,
  CreateLessonPayload,
  CreateSectionPayload,
  Lesson,
  LessonStatus,
  LessonType,
  UpdateLessonPayload,
  UpdateSectionPayload,
} from "@/types/course-structure";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 phút";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  if (hours > 0) {
    return `${hours} giờ`;
  }
  return `${minutes} phút`;
}

function getLessonTypeIcon(type: LessonType, active = false) {
  const iconClassName = (color: string) =>
    active
      ? "h-4 w-4 text-white transition-colors duration-150"
      : `h-4 w-4 ${color} transition-colors duration-150 group-hover:text-primary`;
  switch (type) {
    case "VIDEO":
      return <Video className={iconClassName("text-blue-500")} />;
    case "DOCUMENT":
      return <FileSpreadsheet className={iconClassName("text-amber-500")} />;
    case "QUIZ":
      return <FileQuestion className={iconClassName("text-purple-500")} />;
    case "ASSIGNMENT":
      return <FileCode className={iconClassName("text-indigo-500")} />;
    case "TEXT":
    default:
      return <FileText className={iconClassName("text-emerald-500")} />;
  }
}

function getLessonTypeLabel(type: LessonType): string {
  switch (type) {
    case "VIDEO":
      return "Video";
    case "DOCUMENT":
      return "Tài liệu";
    case "QUIZ":
      return "Trắc nghiệm";
    case "ASSIGNMENT":
      return "Bài tập";
    case "TEXT":
    default:
      return "Bài đọc";
  }
}

function StudentChapterPreview({
  section,
  isExpanded,
  onToggle,
  onPreviewLesson,
  note,
}: {
  section: CourseCurriculumSectionData;
  isExpanded: boolean;
  onToggle: () => void;
  onPreviewLesson: (lessonId: string) => void;
  note: string;
}) {
  return (
    <aside
      aria-label="Giao diện chương trên trang khóa học"
      className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Giao diện trên trang khóa học</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Đây là cùng thành phần giáo trình mà học viên nhìn thấy.
          </p>
        </div>
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
        <CourseCurriculumSection
          section={section}
          isOpen={isExpanded}
          onToggle={onToggle}
          onPreviewLesson={onPreviewLesson}
        />
      </div>
      <p className="mt-3 text-[11px] leading-4 text-slate-500">{note}</p>
    </aside>
  );
}

const lessonTypeOptions: Array<{ value: LessonType; label: string }> = [
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "PDF / Tài liệu" },
  { value: "QUIZ", label: "Quiz" },
  { value: "ASSIGNMENT", label: "Bài tập" },
  { value: "TEXT", label: "Bài đọc" },
];

type LessonEditorTab = "details" | "resources" | "quiz" | "assignment";

function LessonFileDropzone({
  id,
  label,
  hint,
  accept,
  icon,
  file,
  disabled,
  onFileChange,
}: {
  id: string;
  label: string;
  hint: string;
  accept: string;
  icon: React.ReactNode;
  file: File | null;
  disabled: boolean;
  onFileChange: (file: File | null) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectFile = (file: File | null) => {
    onFileChange(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[13px] font-medium text-primary">
        {label}
      </label>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) selectFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-white px-4 text-center transition-colors ${
          isDragging
            ? "border-primary bg-emerald-50/70"
            : "border-slate-200 hover:border-primary/60 hover:bg-emerald-50/30"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          aria-label={label}
          aria-describedby={`${id}-hint`}
          className="sr-only"
          onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <span className="text-primary">{icon}</span>
            <span className="max-w-full truncate text-sm font-semibold text-heading">
              {file.name}
            </span>
            <span className="text-xs text-muted">
              {(file.size / (1024 * 1024)).toFixed(1)} MB · Nhấn để chọn tệp khác
            </span>
          </>
        ) : (
          <>
            <span className="text-heading">{icon}</span>
            <span className="text-sm font-semibold text-heading">
              Kéo thả vào đây hoặc <span className="text-primary">Chọn tệp</span>
            </span>
            <span className="text-xs text-slate-400">{hint}</span>
          </>
        )}
      </label>
      {file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onFileChange(null)}
          className="focus-ring text-xs font-medium text-slate-500 transition hover:text-rose-600 disabled:opacity-50"
        >
          Bỏ tệp đã chọn
        </button>
      ) : null}
      <span id={`${id}-hint`} className="sr-only">
        {hint}
      </span>
    </div>
  );
}

export interface InstructorCourseCurriculumPageProps {
  courseId: string;
  embedded?: boolean;
}

export function InstructorCourseCurriculumPage({
  courseId,
  embedded = false,
}: InstructorCourseCurriculumPageProps) {
  const { accessToken, loading: authLoading } = useAuth();
  const workspaceSidebar = useInstructorWorkspaceSidebar();
  const [localSidebarCollapsed, setLocalSidebarCollapsed] = useState(false);
  const sidebarCollapsed = workspaceSidebar?.sidebarCollapsed ?? localSidebarCollapsed;
  const setSidebarCollapsed = (collapsed: boolean) => {
    if (workspaceSidebar) {
      workspaceSidebar.setSidebarCollapsed(collapsed);
      return;
    }
    setLocalSidebarCollapsed(collapsed);
  };

  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion collapsed state: Map sectionId -> boolean (true = expanded)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Section Modal state
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CourseStructureSection | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionIntroduction, setSectionIntroduction] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [sectionMetaTitle, setSectionMetaTitle] = useState("");
  const [sectionMetaDescription, setSectionMetaDescription] = useState("");
  const [sectionSeoNotice, setSectionSeoNotice] = useState("");
  const [sectionEditorTab, setSectionEditorTab] = useState<"details" | "seo">("details");
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [sectionFormLoading, setSectionFormLoading] = useState(false);
  const [sectionFormError, setSectionFormError] = useState<string | null>(null);
  const studentPreviewSection: CourseCurriculumSectionData = {
    id: `section-editor-preview-${editingSection?.id ?? courseId}`,
    title: sectionTitle,
    introduction: sectionIntroduction,
    description: sectionDescription,
    lessons: (editingSection?.lessons ?? [])
      .filter((lesson) => lesson.status === "PUBLISHED")
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        lessonType: lesson.type,
        durationSeconds: lesson.videoDurationSeconds,
        preview: lesson.isPreview,
      })),
  };

  const handleOpenStudentLesson = () => {
    if (!structure?.courseSlug) return;
    window.open(`/courses/${structure.courseSlug}#curriculum`, "_blank", "noopener,noreferrer");
  };

  // Lesson Modal state
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>("TEXT");
  const [lessonEditorTab, setLessonEditorTab] = useState<LessonEditorTab>("details");
  const [lessonObjectives, setLessonObjectives] = useState<string[]>(["", ""]);
  const [lessonTextContent, setLessonTextContent] = useState("");
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null);
  const [lessonResourceFile, setLessonResourceFile] = useState<File | null>(null);
  const [lessonThumbnailFile, setLessonThumbnailFile] = useState<File | null>(null);
  const [assignmentReferenceFile, setAssignmentReferenceFile] = useState<File | null>(null);
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentRubric, setAssignmentRubric] = useState("");
  const [assignmentStartAt, setAssignmentStartAt] = useState("");
  const [assignmentEndAt, setAssignmentEndAt] = useState("");
  const [pendingVideoLessonId, setPendingVideoLessonId] = useState<string | null>(null);
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState<string>("10");
  const [lessonIsPreview, setLessonIsPreview] = useState(false);
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>("PUBLISHED");
  const [lessonFormLoading, setLessonFormLoading] = useState(false);
  const [lessonFormError, setLessonFormError] = useState<string | null>(null);
  const [quizPassingScore, setQuizPassingScore] = useState("70");
  const [quizQuestions, setQuizQuestions] = useState<QuizDraftQuestion[]>([
    createQuizDraftQuestion(1),
  ]);
  const [incompleteQuizLessonId, setIncompleteQuizLessonId] = useState<string | null>(null);
  const [pendingQuizPublishLessonId, setPendingQuizPublishLessonId] = useState<string | null>(null);
  const nextQuizQuestionId = useRef(2);
  const lessonEditorTabs: Array<{ id: LessonEditorTab; label: string }> = [
    { id: "details", label: "Chi tiết" },
    { id: "resources", label: "Tài liệu" },
    ...(lessonType === "QUIZ" ? [{ id: "quiz" as const, label: "Quiz" }] : []),
    ...(lessonType === "ASSIGNMENT" ? [{ id: "assignment" as const, label: "Bài tập" }] : []),
  ];

  // Delete Section Modal state
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<CourseStructureSection | null>(
    null,
  );
  const [deleteSectionLoading, setDeleteSectionLoading] = useState(false);

  // Delete Lesson Modal state
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<{
    sectionId: string;
    lesson: Lesson;
  } | null>(null);
  const [deleteLessonLoading, setDeleteLessonLoading] = useState(false);

  // Feedback Toast/Modal
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    tone?: FeedbackTone;
  }>({
    isOpen: false,
    title: "",
    tone: "success",
  });

  const loadData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourseStructure(courseId, accessToken);
      setStructure(data);

      // Keep the overview compact; new sections are expanded after creation.
      const initialExpanded: Record<string, boolean> = {};
      data.sections.forEach((sec) => {
        initialExpanded[sec.id] = false;
      });
      setExpandedSections((prev) => ({ ...initialExpanded, ...prev }));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Không thể tải cấu trúc khóa học. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, accessToken]);

  useEffect(() => {
    if (authLoading || !courseId) return;

    let cancelled = false;
    fetchCourseStructure(courseId, accessToken)
      .then((data) => {
        if (cancelled) return;
        setStructure(data);

        const initialExpanded: Record<string, boolean> = {};
        data.sections.forEach((section) => {
          initialExpanded[section.id] = false;
        });
        setExpandedSections((previous) => ({ ...initialExpanded, ...previous }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Không thể tải cấu trúc khóa học. Vui lòng thử lại.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading, courseId]);

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  // -------------------------------------------------------------
  // SECTION CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionTitle("");
    setSectionIntroduction("");
    setSectionDescription("");
    setSectionMetaTitle("");
    setSectionMetaDescription("");
    setSectionSeoNotice("");
    setSectionEditorTab("details");
    setPreviewExpanded(true);
    setSectionFormError(null);
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec: CourseStructureSection) => {
    setEditingSection(sec);
    setSectionTitle(sec.title);
    setSectionIntroduction(sec.introduction ?? "");
    setSectionDescription(sec.description || "");
    setSectionMetaTitle(sec.metaTitle ?? sec.title);
    setSectionMetaDescription(
      sec.metaDescription ?? courseDescriptionToText(sec.description ?? "").slice(0, 160),
    );
    setSectionSeoNotice("");
    setSectionEditorTab("details");
    setPreviewExpanded(true);
    setSectionFormError(null);
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) {
      setSectionFormError("Vui lòng nhập tên chương học");
      return;
    }
    if (courseDescriptionToText(sectionDescription).length > 20000) {
      setSectionFormError("Mô tả chương học không được vượt quá 20000 ký tự");
      return;
    }

    setSectionFormLoading(true);
    setSectionFormError(null);
    let createdSectionId: string | null = null;
    try {
      if (editingSection) {
        // Update
        const payload: UpdateSectionPayload = {
          title: sectionTitle.trim(),
          introduction: sectionIntroduction.trim() || null,
          description: sectionDescription.trim() || null,
          metaTitle: sectionMetaTitle.trim() || null,
          metaDescription: sectionMetaDescription.trim() || null,
        };
        await updateSection(courseId, editingSection.id, payload, accessToken);
      } else {
        // Create
        const payload: CreateSectionPayload = {
          title: sectionTitle.trim(),
          introduction: sectionIntroduction.trim() || null,
          description: sectionDescription.trim() || null,
          metaTitle: sectionMetaTitle.trim() || null,
          metaDescription: sectionMetaDescription.trim() || null,
        };
        const createdSection = await createSection(courseId, payload, accessToken);
        createdSectionId = createdSection.id;
      }

      setSectionModalOpen(false);
      setFeedback({
        isOpen: true,
        title: editingSection ? "Đã cập nhật chương học" : "Đã tạo chương học mới",
        tone: "success",
      });
      await loadData();
      if (createdSectionId) {
        const sectionId = createdSectionId;
        setExpandedSections((current) => ({ ...current, [sectionId]: true }));
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setSectionFormError(err.message);
      } else {
        setSectionFormError("Đã có lỗi xảy ra khi lưu chương học.");
      }
    } finally {
      setSectionFormLoading(false);
    }
  };

  const handleSuggestSeo = () => {
    const descriptionText = courseDescriptionToText(sectionDescription).trim();
    const introductionText = sectionIntroduction.trim();
    const seoTitleSource = sectionTitle.trim() || introductionText || descriptionText;
    const seoDescriptionSource = [introductionText, descriptionText].filter(Boolean).join(" ");
    setSectionMetaTitle(Array.from(seoTitleSource).slice(0, 255).join(""));
    setSectionMetaDescription(Array.from(seoDescriptionSource).slice(0, 160).join(""));
    setSectionSeoNotice("Đã tạo gợi ý từ nội dung chương. Bạn có thể chỉnh sửa trước khi lưu.");
  };

  const handleDeleteSectionConfirm = async () => {
    if (!deleteSectionTarget) return;
    setDeleteSectionLoading(true);
    try {
      await deleteSection(courseId, deleteSectionTarget.id, accessToken);
      setDeleteSectionTarget(null);
      setFeedback({
        isOpen: true,
        title: "Đã xóa chương học thành công",
        tone: "success",
      });
      await loadData();
    } catch (err) {
      setFeedback({
        isOpen: true,
        title: "Xóa chương học thất bại",
        description: err instanceof ApiClientError ? err.message : "Vui lòng thử lại sau.",
        tone: "error",
      });
    } finally {
      setDeleteSectionLoading(false);
    }
  };

  const handleMoveSection = async (index: number, direction: "up" | "down") => {
    if (!structure) return;
    const newSections = [...structure.sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // Swap locally
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Update positions
    const items = newSections.map((sec, idx) => ({
      id: sec.id,
      position: idx + 1,
    }));

    // Optimistic state
    setStructure({
      ...structure,
      sections: newSections,
    });

    try {
      await reorderSections(courseId, { items }, accessToken);
    } catch {
      // Rollback on error
      await loadData();
      setFeedback({
        isOpen: true,
        title: "Thay đổi thứ tự thất bại",
        description: "Không thể lưu thứ tự chương học mới. Đã hoàn tác.",
        tone: "error",
      });
    }
  };

  // -------------------------------------------------------------
  // LESSON CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateLesson = (secId: string) => {
    setTargetSectionId(secId);
    setEditingLesson(null);
    setLessonTitle("");
    setLessonDescription("");
    setLessonType("TEXT");
    setLessonEditorTab("details");
    setLessonObjectives(["", ""]);
    setLessonTextContent("");
    setLessonVideoFile(null);
    setLessonResourceFile(null);
    setLessonThumbnailFile(null);
    setAssignmentReferenceFile(null);
    setAssignmentDescription("");
    setAssignmentRubric("");
    setAssignmentStartAt("");
    setAssignmentEndAt("");
    setPendingVideoLessonId(null);
    setLessonDurationMinutes("10");
    setLessonIsPreview(false);
    setLessonStatus("PUBLISHED");
    setQuizPassingScore("70");
    setQuizQuestions([createQuizDraftQuestion(1)]);
    nextQuizQuestionId.current = 2;
    setIncompleteQuizLessonId(null);
    setPendingQuizPublishLessonId(null);
    setLessonFormError(null);
    setLessonModalOpen(true);
  };

  const handleOpenEditLesson = (secId: string, lesson: Lesson) => {
    setTargetSectionId(secId);
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || "");
    setLessonType(lesson.type);
    setLessonEditorTab("details");
    setLessonObjectives(["", ""]);
    setLessonTextContent(lesson.textContent || "");
    setLessonVideoFile(null);
    setLessonResourceFile(null);
    setLessonThumbnailFile(null);
    setAssignmentReferenceFile(null);
    setAssignmentDescription("");
    setAssignmentRubric("");
    setAssignmentStartAt("");
    setAssignmentEndAt("");
    setPendingVideoLessonId(null);
    setLessonDurationMinutes(
      lesson.videoDurationSeconds ? String(Math.round(lesson.videoDurationSeconds / 60)) : "0",
    );
    setLessonIsPreview(lesson.isPreview);
    setLessonStatus(lesson.status);
    setIncompleteQuizLessonId(null);
    setPendingQuizPublishLessonId(null);
    setLessonFormError(null);
    setLessonModalOpen(true);
  };

  const handleCloseLessonModal = () => {
    if (lessonFormLoading) return;
    setLessonModalOpen(false);
    if (incompleteQuizLessonId) {
      setIncompleteQuizLessonId(null);
      setFeedback({
        isOpen: true,
        title: "Bài kiểm tra chưa hoàn tất",
        description:
          "Bài học đã được tạo nhưng chưa có câu hỏi. Bạn có thể xóa bài học này trong giáo trình rồi tạo lại.",
        tone: "warning",
      });
      void loadData();
    } else if (pendingVideoLessonId) {
      setFeedback({
        isOpen: true,
        title: "Video chưa tải xong",
        description:
          "Bài học vẫn ở trạng thái bản nháp. Mở lại bài học trong giáo trình để thử tải video lần nữa.",
        tone: "warning",
      });
      void loadData();
    } else if (pendingQuizPublishLessonId) {
      setFeedback({
        isOpen: true,
        title: "Bài kiểm tra vẫn là bản nháp",
        description: "Câu hỏi đã được lưu. Mở lại bài học trong giáo trình để hoàn tất xuất bản.",
        tone: "warning",
      });
      void loadData();
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSectionId) return;
    if (!lessonTitle.trim()) {
      setLessonFormError("Vui lòng nhập tên bài học");
      return;
    }

    if (lessonType === "VIDEO" && !editingLesson && !pendingVideoLessonId && !lessonVideoFile) {
      setLessonFormError("Vui lòng chọn video MP4 hoặc WebM cho bài học.");
      return;
    }
    if (lessonVideoFile) {
      if (!["video/mp4", "video/webm"].includes(lessonVideoFile.type)) {
        setLessonFormError("Chỉ hỗ trợ video định dạng MP4 hoặc WebM.");
        return;
      }
      if (lessonVideoFile.size < 1 || lessonVideoFile.size > 2 * 1024 * 1024 * 1024) {
        setLessonFormError("Video phải có dung lượng từ 1 byte đến 2 GB.");
        return;
      }
    }

    const creatingQuiz = lessonType === "QUIZ" && !editingLesson;
    let quizPayload: CreateInstructorQuizRequest | null = null;
    if (creatingQuiz) {
      const passingScore = Number(quizPassingScore);
      if (
        !quizPassingScore.trim() ||
        !Number.isFinite(passingScore) ||
        passingScore < 0 ||
        passingScore > 100
      ) {
        setLessonFormError("Điểm đạt phải nằm trong khoảng từ 0 đến 100.");
        return;
      }
      if (!quizQuestions.length || quizQuestions.length > 100) {
        setLessonFormError("Bài kiểm tra cần có từ 1 đến 100 câu hỏi.");
        setLessonEditorTab("quiz");
        return;
      }
      const invalidQuestion = quizQuestions.find(
        (question) =>
          !question.prompt.trim() ||
          question.prompt.trim().length > 2000 ||
          question.options.filter((option) => option.label.trim()).length < 2 ||
          question.options.filter((option) => option.label.trim()).length > 6 ||
          question.options.some((option) => option.label.trim().length > 500) ||
          question.options.filter((option) => option.label.trim() && option.correct).length !== 1,
      );
      if (invalidQuestion) {
        setLessonFormError(
          `Câu ${quizQuestions.indexOf(invalidQuestion) + 1} cần có nội dung, từ 2 đến 6 phương án hợp lệ và đúng một đáp án đúng.`,
        );
        setLessonEditorTab("quiz");
        return;
      }
      quizPayload = {
        passingScore,
        questions: quizQuestions.map((question) => ({
          prompt: question.prompt.trim(),
          options: question.options
            .filter((option) => option.label.trim())
            .map((option) => ({
              label: option.label.trim(),
              correct: option.correct,
            })),
        })),
      };
    }

    if (
      lessonType === "ASSIGNMENT" &&
      assignmentStartAt &&
      assignmentEndAt &&
      new Date(assignmentEndAt).getTime() < new Date(assignmentStartAt).getTime()
    ) {
      setLessonFormError("Ngày kết thúc phải sau ngày bắt đầu.");
      setLessonEditorTab("assignment");
      return;
    }

    const durationSeconds =
      Number(lessonDurationMinutes) > 0 ? Number(lessonDurationMinutes) * 60 : 0;

    setLessonFormLoading(true);
    setLessonFormError(null);
    let createdLessonId: string | null = null;
    let completedQuizLessonId: string | null = null;
    try {
      if (editingLesson) {
        const payload: UpdateLessonPayload = {
          title: lessonTitle.trim(),
          description: lessonDescription.trim() || null,
          type: lessonType,
          textContent: lessonTextContent.trim() || null,
          videoDurationSeconds: durationSeconds,
          isPreview: lessonIsPreview,
          status: lessonStatus,
        };
        await updateLesson(courseId, targetSectionId, editingLesson.id, payload, accessToken);
        if (lessonType === "VIDEO" && lessonVideoFile) {
          await uploadLessonVideo(
            courseId,
            targetSectionId,
            editingLesson.id,
            lessonVideoFile,
            accessToken,
          );
        }
      } else {
        const payload: CreateLessonPayload = {
          title: lessonTitle.trim(),
          description: lessonDescription.trim() || null,
          type: lessonType,
          textContent: lessonTextContent.trim() || null,
          videoDurationSeconds: durationSeconds,
          isPreview: lessonIsPreview,
          status: lessonStatus,
        };
        if (pendingVideoLessonId && lessonVideoFile) {
          await uploadLessonVideo(
            courseId,
            targetSectionId,
            pendingVideoLessonId,
            lessonVideoFile,
            accessToken,
          );
          await updateLesson(courseId, targetSectionId, pendingVideoLessonId, payload, accessToken);
          setPendingVideoLessonId(null);
        } else if (pendingQuizPublishLessonId) {
          await updateLesson(
            courseId,
            targetSectionId,
            pendingQuizPublishLessonId,
            payload,
            accessToken,
          );
          setPendingQuizPublishLessonId(null);
        } else if (incompleteQuizLessonId) {
          if (!quizPayload) throw new Error("Hãy hoàn thiện câu hỏi trước khi lưu bài kiểm tra.");
          await createInstructorQuiz(incompleteQuizLessonId, quizPayload, accessToken);
          completedQuizLessonId = incompleteQuizLessonId;
          setIncompleteQuizLessonId(null);
          setPendingQuizPublishLessonId(incompleteQuizLessonId);
          await updateLesson(
            courseId,
            targetSectionId,
            incompleteQuizLessonId,
            payload,
            accessToken,
          );
        } else {
          const createdLesson = await createLesson(
            courseId,
            targetSectionId,
            {
              ...payload,
              status: creatingQuiz || lessonType === "VIDEO" ? "DRAFT" : lessonStatus,
            },
            accessToken,
          );
          createdLessonId = createdLesson.id;
          if (creatingQuiz && quizPayload) {
            setIncompleteQuizLessonId(createdLesson.id);
            await createInstructorQuiz(createdLesson.id, quizPayload, accessToken);
            completedQuizLessonId = createdLesson.id;
            setIncompleteQuizLessonId(null);
            setPendingQuizPublishLessonId(createdLesson.id);
            await updateLesson(courseId, targetSectionId, createdLesson.id, payload, accessToken);
            setPendingQuizPublishLessonId(null);
          } else if (lessonType === "VIDEO" && lessonVideoFile) {
            setPendingVideoLessonId(createdLesson.id);
            await uploadLessonVideo(
              courseId,
              targetSectionId,
              createdLesson.id,
              lessonVideoFile,
              accessToken,
            );
            await updateLesson(courseId, targetSectionId, createdLesson.id, payload, accessToken);
            setPendingVideoLessonId(null);
          }
        }
      }

      setIncompleteQuizLessonId(null);
      setPendingQuizPublishLessonId(null);
      setPendingVideoLessonId(null);
      setLessonVideoFile(null);
      setLessonModalOpen(false);
      setFeedback({
        isOpen: true,
        title: editingLesson ? "Đã cập nhật bài học" : "Đã tạo bài học mới",
        tone: "success",
      });
      await loadData();
    } catch (err) {
      if (completedQuizLessonId || pendingQuizPublishLessonId) {
        setLessonFormError(
          "Bài kiểm tra đã lưu nhưng chưa thể xuất bản. Hãy lưu lại để hoàn tất, câu hỏi sẽ không bị tạo trùng.",
        );
      } else if (createdLessonId || incompleteQuizLessonId || pendingVideoLessonId) {
        setLessonFormError(
          lessonType === "VIDEO" || pendingVideoLessonId
            ? `Bài học đã được tạo nhưng video chưa tải xong. ${err instanceof ApiClientError ? err.message : "Hãy thử lại; bài học sẽ không bị tạo trùng."}`
            : "Bài học đã được tạo, nhưng chưa lưu được câu hỏi. Nội dung bài học đã khóa; hãy thử lưu câu hỏi lại.",
        );
      } else if (err instanceof ApiClientError) {
        setLessonFormError(err.message);
      } else {
        setLessonFormError("Đã có lỗi xảy ra khi lưu bài học.");
      }
    } finally {
      setLessonFormLoading(false);
    }
  };

  const handleDeleteLessonConfirm = async () => {
    if (!deleteLessonTarget) return;
    setDeleteLessonLoading(true);
    try {
      await deleteLesson(
        courseId,
        deleteLessonTarget.sectionId,
        deleteLessonTarget.lesson.id,
        accessToken,
      );
      setDeleteLessonTarget(null);
      setFeedback({
        isOpen: true,
        title: "Đã xóa bài học thành công",
        tone: "success",
      });
      await loadData();
    } catch (err) {
      setFeedback({
        isOpen: true,
        title: "Xóa bài học thất bại",
        description: err instanceof ApiClientError ? err.message : "Vui lòng thử lại sau.",
        tone: "error",
      });
    } finally {
      setDeleteLessonLoading(false);
    }
  };

  const handleMoveLesson = async (
    sectionId: string,
    lessonIndex: number,
    direction: "up" | "down",
  ) => {
    if (!structure) return;
    const targetSection = structure.sections.find((s) => s.id === sectionId);
    if (!targetSection) return;

    const newLessons = [...targetSection.lessons];
    const targetIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
    if (targetIndex < 0 || targetIndex >= newLessons.length) return;

    // Swap locally
    const temp = newLessons[lessonIndex];
    newLessons[lessonIndex] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;

    // Update positions
    const items = newLessons.map((les, idx) => ({
      id: les.id,
      position: idx + 1,
    }));

    // Optimistic update
    const updatedSections = structure.sections.map((s) =>
      s.id === sectionId ? { ...s, lessons: newLessons } : s,
    );
    setStructure({
      ...structure,
      sections: updatedSections,
    });

    try {
      await reorderLessons(courseId, sectionId, { items }, accessToken);
    } catch {
      await loadData();
      setFeedback({
        isOpen: true,
        title: "Thay đổi thứ tự bài học thất bại",
        description: "Không thể lưu thứ tự bài học mới. Đã hoàn tác.",
        tone: "error",
      });
    }
  };

  return (
    <div
      className={`${embedded ? "min-w-0" : "flex min-h-screen flex-col bg-[#F9FBFA]"} text-ink antialiased`}
    >
      {!embedded ? <AppHeader /> : null}

      <main className={embedded ? "min-w-0" : "flex-1 pb-24 pt-8"}>
        <div className={embedded ? "mx-auto w-full" : "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"}>
          {/* Breadcrumbs & Navigation */}
          {!embedded ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Link
                  href="/courses"
                  className="flex items-center gap-1.5 transition hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Quản lý khóa học</span>
                </Link>
                <span className="text-slate-300">/</span>
                <span className="font-medium text-heading">Chương trình học</span>
              </div>

              {structure && (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/courses/${structure.courseSlug}`}
                    target="_blank"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:bg-slate-100"
                  >
                    <Eye className="h-4 w-4 text-slate-500" />
                    <span>Xem trang khóa học</span>
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {/* Hero / Header Card */}
          <div
            className={`relative overflow-hidden ${embedded ? "border-0 bg-transparent p-0 shadow-none" : "rounded-lg border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8"}`}
          >
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              {!embedded ? (
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Layers className="h-3.5 w-3.5" />
                      Chương trình đào tạo
                    </span>
                  </div>
                  <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-heading sm:text-3xl">
                    {loading ? (
                      <Skeleton className="h-9 w-72 rounded-lg" />
                    ) : (
                      structure?.courseTitle || "Soạn giáo trình"
                    )}
                  </h1>
                  <p className="mt-1 text-sm text-muted">
                    Thiết kế cấu trúc chương học, bài giảng và sắp xếp thứ tự phân phối nội dung cho
                    học viên.
                  </p>
                </div>
              ) : null}

              {/* Action */}
              <div className={`flex shrink-0 items-center gap-3 ${embedded ? "justify-end" : ""}`}>
                <Button
                  onClick={handleOpenCreateSection}
                  className="rounded-xl shadow-xs"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                  <span>{embedded ? "Thêm chương" : "Thêm chương mới"}</span>
                </Button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            {!embedded && structure && (
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-2xl bg-[#F5FBF9] p-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted">Tổng số chương</div>
                    <div className="text-base font-bold text-heading">
                      {structure.totalSections} chương
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-sky-50/60 p-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted">Tổng số bài học</div>
                    <div className="text-base font-bold text-heading">
                      {structure.totalLessons} bài học
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-amber-50/60 p-3.5 sm:col-span-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted">Thời lượng bài học</div>
                    <div className="text-base font-bold text-heading">
                      {formatDuration(structure.totalDurationSeconds)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="mt-8">
            {/* Loading State */}
            {loading && (
              <div className="space-y-4" aria-label="Đang tải cấu trúc chương" aria-busy="true">
                <CourseCurriculumSectionsSkeleton />
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
                <h3 className="mt-2 text-base font-semibold text-rose-900">{error}</h3>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLoading(true);
                      setError(null);
                      void loadData();
                    }}
                  >
                    Tải lại dữ liệu
                  </Button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && structure && structure.sections.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Layers className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-heading">Chưa có chương học nào</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                  Hãy bắt đầu xây dựng khóa học bằng cách tạo chương đầu tiên, sau đó thêm các bài
                  học vào giáo trình.
                </p>
                <div className="mt-6">
                  <Button onClick={handleOpenCreateSection} className="rounded-xl shadow-xs">
                    <Plus className="h-4 w-4" />
                    <span>Tạo chương đầu tiên</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Sections Accordion List */}
            {!loading && !error && structure && structure.sections.length > 0 && (
              <div className="space-y-4">
                {structure.sections.map((sec, secIndex) => {
                  const isExpanded = expandedSections[sec.id] ?? true;
                  const isFirst = secIndex === 0;
                  const isLast = secIndex === structure.sections.length - 1;

                  return (
                    <div
                      key={sec.id}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white transition duration-200 hover:border-slate-300"
                    >
                      {/* Section Header */}
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div
                          className="flex flex-1 cursor-pointer items-start gap-3.5 select-none"
                          onClick={() => toggleSection(sec.id)}
                        >
                          <button
                            type="button"
                            aria-label={isExpanded ? "Thu gọn chương" : "Mở rộng chương"}
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                                Chương {secIndex + 1}
                              </span>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="text-xs font-medium text-muted">
                                {sec.totalLessons} bài học
                              </span>
                              {sec.totalDurationSeconds > 0 && (
                                <>
                                  <span className="text-xs text-slate-300">•</span>
                                  <span className="text-xs font-medium text-muted">
                                    {formatDuration(sec.totalDurationSeconds)}
                                  </span>
                                </>
                              )}
                            </div>
                            <h3 className="mt-1 text-base font-bold text-heading">{sec.title}</h3>
                            {sec.description && courseDescriptionToText(sec.description) ? (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                                {courseDescriptionToText(sec.description)}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* Section Actions */}
                        <div className="flex shrink-0 items-center gap-1.5 self-end border-t border-slate-100 pt-2 sm:self-center sm:border-t-0 sm:pt-0">
                          {/* Reorder Buttons */}
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveSection(secIndex, "up")}
                            title="Di chuyển lên"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveSection(secIndex, "down")}
                            title="Di chuyển xuống"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>

                          <div className="mx-1 h-4 w-[1px] bg-slate-200" />

                          {/* Edit Section */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditSection(sec)}
                            title="Chỉnh sửa chương"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Section */}
                          <button
                            type="button"
                            onClick={() => setDeleteSectionTarget(sec)}
                            title="Xóa chương học"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <div className="mx-1 h-4 w-[1px] bg-slate-200" />

                          {/* Add Lesson to this section */}
                          <button
                            type="button"
                            onClick={() => handleOpenCreateLesson(sec.id)}
                            className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Thêm bài học</span>
                          </button>
                        </div>
                      </div>

                      {/* Section Body (Lessons List) */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-[#FAFBFB] p-4 sm:p-5">
                          {sec.lessons.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-6 text-center">
                              <p className="text-xs text-muted">
                                Chưa có bài học nào trong chương này.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenCreateLesson(sec.id)}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Thêm bài học đầu tiên</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {sec.lessons.map((lesson, lessonIndex) => {
                                const isLessonFirst = lessonIndex === 0;
                                const isLessonLast = lessonIndex === sec.lessons.length - 1;

                                return (
                                  <div
                                    key={lesson.id}
                                    className="group flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs transition hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    {/* Left: Type icon & Info */}
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                                        {getLessonTypeIcon(lesson.type)}
                                      </div>

                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-xs font-medium text-slate-400">
                                            {secIndex + 1}.{lessonIndex + 1}
                                          </span>
                                          <h4 className="text-sm font-semibold text-heading">
                                            {lesson.title}
                                          </h4>
                                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                            {getLessonTypeLabel(lesson.type)}
                                          </span>
                                          {lesson.isPreview && (
                                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                              Học thử miễn phí
                                            </span>
                                          )}
                                          {lesson.status === "DRAFT" && (
                                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                              Bản nháp
                                            </span>
                                          )}
                                        </div>

                                        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
                                          {lesson.videoDurationSeconds &&
                                          lesson.videoDurationSeconds > 0 ? (
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {Math.round(lesson.videoDurationSeconds / 60)} phút
                                            </span>
                                          ) : null}
                                          {lesson.textContent && (
                                            <span className="line-clamp-1">
                                              {lesson.textContent.length} ký tự
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                                      <button
                                        type="button"
                                        disabled={isLessonFirst}
                                        onClick={() => handleMoveLesson(sec.id, lessonIndex, "up")}
                                        title="Di chuyển lên"
                                        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
                                      >
                                        <ArrowUp className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLessonLast}
                                        onClick={() =>
                                          handleMoveLesson(sec.id, lessonIndex, "down")
                                        }
                                        title="Di chuyển xuống"
                                        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition"
                                      >
                                        <ArrowDown className="h-3.5 w-3.5" />
                                      </button>

                                      <div className="mx-1 h-3.5 w-[1px] bg-slate-200" />

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditLesson(sec.id, lesson)}
                                        title="Sửa bài học"
                                        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeleteLessonTarget({
                                            sectionId: sec.id,
                                            lesson,
                                          })
                                        }
                                        title="Xóa bài học"
                                        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* SECTION FORM MODAL */}
      {/* ------------------------------------------------------------- */}
      {sectionModalOpen && (
        <div className="fixed inset-0 z-[9990] overflow-y-auto bg-[#f8fafc] text-slate-900">
          <div
            id="section-editor-layout"
            className={`grid min-h-dvh w-full grid-cols-1 transition-[grid-template-columns] duration-300 ease-in-out motion-reduce:transition-none ${sidebarCollapsed ? "lg:grid-cols-[88px_303px_minmax(0,1fr)]" : "lg:grid-cols-[261px_303px_minmax(0,1fr)]"} lg:grid-rows-[64px_auto]`}
          >
            <aside
              id="section-editor-global-sidebar"
              className="hidden bg-[#101a2c] text-white lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:min-h-dvh lg:flex-col"
            >
              <InstructorWorkspaceSidebar
                activeSection="courses"
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                controlsId="section-editor-global-sidebar"
                showAccountAvatar
              />
            </aside>

            <aside
              id="section-editor-structure"
              className="row-start-2 border-b border-slate-200 bg-white lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r"
            >
              <div className="flex min-h-[42px] items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-[#62748e]">
                  Cấu trúc chương
                </h3>
                {editingSection ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSectionModalOpen(false);
                      handleOpenCreateLesson(editingSection.id);
                    }}
                    className="focus-ring inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:text-[#087f5b]"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Thêm bài học
                  </button>
                ) : null}
              </div>
              <div className="space-y-2 p-2">
                {structure?.sections.map((section, sectionIndex) => {
                  const active = section.id === editingSection?.id;
                  return (
                    <div key={section.id}>
                      <div
                        className={`flex items-center gap-2 rounded-md px-3 py-2 ${active ? "bg-[#e6faf2] text-[#314158]" : "text-slate-600"}`}
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-slate-400"}`}
                          aria-hidden="true"
                        />
                        <span className="line-clamp-2 text-xs font-semibold">
                          Chương {sectionIndex + 1} - {section.title}
                        </span>
                      </div>
                      {active ? (
                        <div className="ml-5 border-l border-slate-200 py-1 pl-2">
                          {section.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex min-h-[30px] items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-600"
                            >
                              {getLessonTypeIcon(lesson.type)}
                              <span className="truncate">{lesson.title}</span>
                            </div>
                          ))}
                          {section.lessons.length === 0 ? (
                            <p className="px-2 py-1 text-xs text-slate-400">Chưa có bài học</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </aside>

            <header className="sticky top-0 z-20 row-start-1 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2 sm:px-6 lg:col-start-3 lg:row-start-1 lg:px-[25px]">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSectionModalOpen(false)}
                  disabled={sectionFormLoading}
                  aria-label="Quay lại danh sách chương"
                  className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <h2 className="min-w-0 truncate text-sm font-semibold text-slate-700 sm:text-lg">
                  {sectionTitle.trim() ||
                    (editingSection ? editingSection.title : "Thêm chương mới")}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {editingSection ? (
                  <button
                    type="button"
                    disabled={sectionFormLoading}
                    onClick={() => {
                      setSectionModalOpen(false);
                      setDeleteSectionTarget(editingSection);
                    }}
                    className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white transition hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
                  >
                    Xóa
                  </button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSectionModalOpen(false)}
                  disabled={sectionFormLoading}
                  className="min-h-10 rounded-lg px-3 sm:px-4"
                >
                  Hủy
                </Button>
                <button
                  type="submit"
                  form="section-form"
                  disabled={sectionFormLoading}
                  className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
                >
                  {sectionFormLoading ? "Đang lưu..." : editingSection ? "Cập nhật" : "Lưu chương"}
                </button>
              </div>
            </header>

            <section className="row-start-3 min-w-0 lg:col-start-3 lg:row-start-2">
              <nav
                aria-label="Nội dung chương"
                role="tablist"
                className="flex min-h-[54px] gap-1 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-[25px]"
              >
                <button
                  type="button"
                  role="tab"
                  id="section-details-tab"
                  aria-selected={sectionEditorTab === "details"}
                  onClick={() => setSectionEditorTab("details")}
                  className={`focus-ring border-b-2 px-2.5 py-3.5 text-sm transition ${sectionEditorTab === "details" ? "border-primary font-semibold text-primary" : "border-transparent font-medium text-slate-600 hover:text-slate-900"}`}
                >
                  Chi tiết
                </button>
                <button
                  type="button"
                  role="tab"
                  id="section-seo-tab"
                  aria-selected={sectionEditorTab === "seo"}
                  onClick={() => setSectionEditorTab("seo")}
                  className={`focus-ring border-b-2 px-2.5 py-3.5 text-sm transition ${sectionEditorTab === "seo" ? "border-primary font-semibold text-primary" : "border-transparent font-medium text-slate-600 hover:text-slate-900"}`}
                >
                  SEO
                </button>
              </nav>

              <form
                id="section-form"
                onSubmit={handleSaveSection}
                className="min-w-0 px-4 py-4 sm:px-6 lg:px-[25px]"
              >
                {sectionFormError ? (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700"
                  >
                    {sectionFormError}
                  </div>
                ) : null}

                {sectionEditorTab === "details" ? (
                  <div
                    id="section-details-panel"
                    role="tabpanel"
                    aria-labelledby="section-details-tab"
                    className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
                  >
                    <div className="min-w-0">
                      <div className="mb-5">
                        <h3 className="text-base font-semibold text-primary">Nội dung chi tiết</h3>
                        <p className="mt-1 text-[13px] leading-5 text-[#62748e]">
                          Hãy điền thông tin chương mà học viên sẽ thấy.
                        </p>
                      </div>
                      <div className="space-y-5">
                        <div>
                          <label
                            htmlFor="section-title"
                            className="block pb-1.5 text-[13px] font-medium text-primary"
                          >
                            Tiêu đề <span className="text-red-600">*</span>
                          </label>
                          <input
                            id="section-title"
                            type="text"
                            required
                            maxLength={255}
                            value={sectionTitle}
                            onChange={(event) => setSectionTitle(event.target.value)}
                            placeholder="Ví dụ: Giới thiệu khóa học và cài đặt môi trường"
                            className="h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-0"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="section-introduction"
                            className="block pb-1.5 text-[13px] font-medium text-primary"
                          >
                            Giới thiệu
                          </label>
                          <input
                            id="section-introduction"
                            type="text"
                            maxLength={500}
                            value={sectionIntroduction}
                            onChange={(event) => setSectionIntroduction(event.target.value)}
                            placeholder="Giới thiệu ngắn về nội dung chương..."
                            className="h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-0"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label className="block pb-1.5 text-[13px] font-medium text-primary">
                              Mô tả
                            </label>
                            <span className="text-xs text-slate-500">
                              {courseDescriptionToText(sectionDescription).length}/20000
                            </span>
                          </div>
                          <RichTextEditor
                            label="Mô tả chương học"
                            value={sectionDescription}
                            onChange={setSectionDescription}
                            compact
                          />
                        </div>
                      </div>
                    </div>

                    <StudentChapterPreview
                      section={studentPreviewSection}
                      isExpanded={previewExpanded}
                      onToggle={() => setPreviewExpanded((expanded) => !expanded)}
                      onPreviewLesson={handleOpenStudentLesson}
                      note="Bản xem trước áp dụng nội dung chương bạn đang nhập."
                    />
                  </div>
                ) : (
                  <div
                    id="section-seo-panel"
                    role="tabpanel"
                    aria-labelledby="section-seo-tab"
                    className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]"
                  >
                    <div className="min-w-0">
                      <div className="mb-5">
                        <h3 className="text-base font-semibold text-primary">Cài đặt SEO</h3>
                        <p className="mt-1 text-[13px] leading-5 text-[#62748e]">
                          Tối ưu hóa chương này cho công cụ tìm kiếm.
                        </p>
                      </div>
                      <div className="space-y-5">
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label
                              htmlFor="section-meta-title"
                              className="block pb-1.5 text-[13px] font-medium text-primary"
                            >
                              Tiêu đề SEO
                            </label>
                            <span className="text-xs text-slate-500">
                              {sectionMetaTitle.length}/255
                            </span>
                          </div>
                          <input
                            id="section-meta-title"
                            type="text"
                            maxLength={255}
                            value={sectionMetaTitle}
                            onChange={(event) => setSectionMetaTitle(event.target.value)}
                            placeholder="Tiêu đề hiển thị trên công cụ tìm kiếm..."
                            className="h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-0"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label
                              htmlFor="section-meta-description"
                              className="block pb-1.5 text-[13px] font-medium text-primary"
                            >
                              Mô tả SEO
                            </label>
                            <span className="text-xs text-slate-500">
                              {sectionMetaDescription.length}/500
                            </span>
                          </div>
                          <textarea
                            id="section-meta-description"
                            rows={4}
                            maxLength={500}
                            value={sectionMetaDescription}
                            onChange={(event) => setSectionMetaDescription(event.target.value)}
                            placeholder="Mô tả ngắn hiển thị trên kết quả tìm kiếm..."
                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] leading-5 text-slate-800 placeholder:text-slate-400 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-0"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={
                            !sectionTitle.trim() &&
                            !sectionIntroduction.trim() &&
                            !sectionDescription.trim()
                          }
                          onClick={handleSuggestSeo}
                          className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-[#079367] px-4 text-sm font-semibold text-white transition hover:bg-[#087f5b] active:bg-[#066a4b] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Tạo gợi ý SEO
                        </button>
                        {sectionSeoNotice ? (
                          <p role="status" className="text-sm text-emerald-700">
                            {sectionSeoNotice}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <StudentChapterPreview
                      section={studentPreviewSection}
                      isExpanded={previewExpanded}
                      onToggle={() => setPreviewExpanded((expanded) => !expanded)}
                      onPreviewLesson={handleOpenStudentLesson}
                      note="Tiêu đề và mô tả SEO là metadata tìm kiếm; chúng không hiển thị trong nội dung chương này."
                    />
                  </div>
                )}
              </form>
            </section>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LESSON FORM MODAL */}
      {/* ------------------------------------------------------------- */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-[9990] overflow-y-auto bg-[#f8fafc] text-slate-900">
          <div
            id="lesson-editor-layout"
            className={`grid min-h-dvh w-full grid-cols-1 transition-[grid-template-columns] duration-300 ease-in-out motion-reduce:transition-none ${sidebarCollapsed ? "lg:grid-cols-[88px_303px_minmax(0,1fr)]" : "lg:grid-cols-[261px_303px_minmax(0,1fr)]"} lg:grid-rows-[64px_auto]`}
          >
            <aside
              id="lesson-editor-global-sidebar"
              className="hidden bg-[#101a2c] text-white lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:min-h-dvh lg:flex-col"
            >
              <InstructorWorkspaceSidebar
                activeSection="courses"
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                controlsId="lesson-editor-global-sidebar"
              />
            </aside>

            <aside
              id="lesson-editor-structure"
              className="row-start-2 border-b border-slate-200 bg-white lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r"
            >
              <div className="flex min-h-[42px] items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-[#62748e]">
                  Cấu trúc chương
                </h3>
              </div>
              <div className="space-y-2 p-2">
                {structure?.sections.map((section, sectionIndex) => {
                  const active = section.id === targetSectionId;
                  const canChangeSection =
                    !editingLesson && !pendingVideoLessonId && !incompleteQuizLessonId;
                  return (
                    <div key={section.id}>
                      <button
                        type="button"
                        disabled={!canChangeSection}
                        onClick={() => setTargetSectionId(section.id)}
                        className={`focus-ring w-full rounded-md px-3 py-2 text-left text-xs font-semibold transition ${active ? "bg-[#e6faf2] text-[#314158]" : "text-slate-600 hover:bg-slate-50"} disabled:cursor-default`}
                      >
                        Chương {sectionIndex + 1} - {section.title}
                      </button>
                      {active ? (
                        <div className="ml-5 border-l border-slate-200 py-1 pl-2">
                          {section.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex min-h-[30px] items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-600"
                            >
                              {getLessonTypeIcon(lesson.type)}
                              <span className="truncate">{lesson.title}</span>
                            </div>
                          ))}
                          {!section.lessons.length ? (
                            <p className="px-2 py-1 text-xs text-slate-400">Chưa có bài học</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </aside>

            <header className="sticky top-0 z-20 row-start-1 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:col-start-3 lg:row-start-1 lg:px-[25px]">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseLessonModal}
                  disabled={lessonFormLoading}
                  aria-label="Quay lại giáo trình"
                  className="focus-ring inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-xs text-[#62748e]">
                    {structure?.sections.find((section) => section.id === targetSectionId)?.title ??
                      "Cấu trúc chương"}
                  </p>
                  <h2 className="truncate text-sm font-semibold text-slate-700 sm:text-lg">
                    {editingLesson ? "Chỉnh sửa bài học" : "Thêm bài học mới"}
                  </h2>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseLessonModal}
                  disabled={lessonFormLoading}
                  className="min-h-10 rounded-lg px-3 sm:px-4"
                >
                  Hủy
                </Button>
                <button
                  type="submit"
                  form="lesson-form"
                  disabled={lessonFormLoading}
                  className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
                >
                  {lessonFormLoading
                    ? "Đang lưu..."
                    : lessonStatus === "PUBLISHED"
                      ? "Lưu và xuất bản"
                      : "Lưu bản nháp"}
                </button>
              </div>
            </header>

            <main className="row-start-3 min-w-0 bg-[#f8fafc] lg:col-start-3 lg:row-start-2">
              <form id="lesson-form" onSubmit={handleSaveLesson} className="min-w-0">
                <nav
                  aria-label="Các phần nội dung bài học"
                  className="sticky top-16 z-10 flex min-h-[50px] items-end border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-6"
                >
                  <div role="tablist" className="flex min-h-[49px] items-stretch gap-1">
                    {lessonEditorTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={lessonEditorTab === tab.id}
                        onClick={() => setLessonEditorTab(tab.id)}
                        className={`focus-ring min-w-[60px] border-b-2 px-3 text-[13px] transition-colors ${
                          lessonEditorTab === tab.id
                            ? "border-primary font-semibold text-primary"
                            : "border-transparent font-medium text-[#62748e] hover:text-primary"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </nav>

                <div className="min-h-[calc(100dvh-114px)] px-4 py-6 sm:px-6 lg:px-6">
                  {lessonFormError ? (
                    <div
                      role="alert"
                      className="mb-5 max-w-[680px] rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
                    >
                      {lessonFormError}
                    </div>
                  ) : null}
                  {incompleteQuizLessonId ? (
                    <p className="mb-5 max-w-[680px] rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                      Bài học đã được tạo. Hãy hoàn tất bước lưu câu hỏi bên dưới; thông tin bài học
                      đã khóa.
                    </p>
                  ) : null}

                  {lessonEditorTab === "details" ? (
                    <section
                      className="max-w-[680px] space-y-5"
                      aria-labelledby="lesson-details-title"
                    >
                      <div>
                        <h3
                          id="lesson-details-title"
                          className="text-base font-semibold text-primary"
                        >
                          Nội dung chi tiết bài học
                        </h3>
                        <p className="mt-1 text-[13px] leading-5 text-[#62748e]">
                          Thiết lập thông tin cơ bản và mục tiêu học tập cho bài học này.
                        </p>
                      </div>

                      {!incompleteQuizLessonId ? (
                        <>
                          <fieldset disabled={Boolean(lessonFormLoading)}>
                            <legend className="text-[13px] font-medium text-primary">
                              Loại bài
                            </legend>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {lessonTypeOptions.map((option) => {
                                const disabled =
                                  editingLesson?.type === "QUIZ" ||
                                  Boolean(pendingVideoLessonId) ||
                                  (option.value === "QUIZ" && Boolean(editingLesson));
                                const selected = lessonType === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={selected}
                                    disabled={disabled}
                                    onClick={() => {
                                      setLessonType(option.value);
                                      setLessonEditorTab("details");
                                      setLessonVideoFile(null);
                                      setLessonFormError(null);
                                    }}
                                    className={`focus-ring group inline-flex min-h-8 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors ${
                                      selected
                                        ? "border-primary bg-primary text-white"
                                        : "border-slate-200 bg-white text-[#45556c] hover:border-primary/50 hover:text-primary"
                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                  >
                                    {getLessonTypeIcon(option.value, selected)}
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </fieldset>

                          <div>
                            <label
                              htmlFor="lesson-title"
                              className="block text-[13px] font-medium text-primary"
                            >
                              {lessonType === "QUIZ"
                                ? "Tên Quiz"
                                : lessonType === "ASSIGNMENT"
                                  ? "Tên bài tập"
                                  : "Tên bài học"}
                              <span className="ml-1 text-rose-500">*</span>
                            </label>
                            <input
                              id="lesson-title"
                              type="text"
                              required
                              disabled={Boolean(incompleteQuizLessonId) || lessonFormLoading}
                              value={lessonTitle}
                              onChange={(event) => setLessonTitle(event.target.value)}
                              placeholder="Nhập tên bài học"
                              className="focus-ring mt-2 h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-[#1d293d] placeholder:text-slate-400"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="lesson-introduction"
                              className="block text-[13px] font-medium text-primary"
                            >
                              Giới thiệu
                            </label>
                            <textarea
                              id="lesson-introduction"
                              rows={2}
                              maxLength={500}
                              disabled={Boolean(incompleteQuizLessonId) || lessonFormLoading}
                              value={lessonDescription}
                              onChange={(event) => setLessonDescription(event.target.value)}
                              placeholder="Giới thiệu ngắn về nội dung bài học..."
                              className="focus-ring mt-2 min-h-[60px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] leading-5 text-[#1d293d] placeholder:text-slate-400"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-[13px] font-medium text-primary">
                                Mô tả
                              </label>
                              <span className="text-xs text-[#90a1b9]">
                                {courseDescriptionToText(lessonTextContent).length}/20000
                              </span>
                            </div>
                            <div className="mt-2">
                              <RichTextEditor
                                label="Mô tả bài học"
                                value={lessonTextContent}
                                onChange={setLessonTextContent}
                                disabled={Boolean(incompleteQuizLessonId) || lessonFormLoading}
                                compact
                              />
                            </div>
                          </div>

                          <fieldset disabled={Boolean(incompleteQuizLessonId) || lessonFormLoading}>
                            <legend className="text-[13px] font-medium text-primary">
                              Mục tiêu bài học
                            </legend>
                            <div className="mt-2 space-y-2">
                              {lessonObjectives.map((objective, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-primary">
                                    {index + 1}
                                  </span>
                                  <label className="sr-only" htmlFor={`lesson-objective-${index}`}>
                                    Mục tiêu {index + 1}
                                  </label>
                                  <input
                                    id={`lesson-objective-${index}`}
                                    type="text"
                                    maxLength={300}
                                    value={objective}
                                    onChange={(event) =>
                                      setLessonObjectives((current) =>
                                        current.map((value, objectiveIndex) =>
                                          objectiveIndex === index ? event.target.value : value,
                                        ),
                                      )
                                    }
                                    placeholder={`Mục tiêu ${index + 1}...`}
                                    className="focus-ring h-[38px] min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-heading placeholder:text-slate-400"
                                  />
                                  <button
                                    type="button"
                                    aria-label={`Xóa mục tiêu ${index + 1}`}
                                    disabled={lessonObjectives.length <= 1}
                                    onClick={() =>
                                      setLessonObjectives((current) =>
                                        current.filter(
                                          (_, objectiveIndex) => objectiveIndex !== index,
                                        ),
                                      )
                                    }
                                    className="focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                disabled={lessonObjectives.length >= 10}
                                onClick={() => setLessonObjectives((current) => [...current, ""])}
                                className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-primary transition hover:text-emerald-700 disabled:opacity-50"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                Thêm mục tiêu
                              </button>
                            </div>
                          </fieldset>

                          <details className="group rounded-lg border border-slate-200 bg-white">
                            <summary className="focus-ring cursor-pointer list-none px-4 py-3 text-xs font-semibold text-[#45556c] marker:hidden">
                              Tùy chọn bài học
                              <ChevronDown
                                className="float-right h-4 w-4 transition-transform group-open:rotate-180"
                                aria-hidden="true"
                              />
                            </summary>
                            <div className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor="lesson-duration"
                                  className="block text-xs font-medium text-[#45556c]"
                                >
                                  Thời lượng ước tính (phút)
                                </label>
                                <input
                                  id="lesson-duration"
                                  type="number"
                                  min="0"
                                  value={lessonDurationMinutes}
                                  onChange={(event) => setLessonDurationMinutes(event.target.value)}
                                  className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                />
                              </div>
                              <label className="flex cursor-pointer items-start gap-2 pt-1">
                                <input
                                  type="checkbox"
                                  checked={lessonIsPreview}
                                  onChange={(event) => setLessonIsPreview(event.target.checked)}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span>
                                  <span className="text-xs font-semibold text-heading">
                                    Cho phép học thử
                                  </span>
                                  <span className="mt-0.5 block text-[11px] leading-4 text-muted">
                                    Học viên chưa mua khóa học vẫn xem được bài này.
                                  </span>
                                </span>
                              </label>
                              <div className="sm:col-span-2">
                                <label
                                  htmlFor="lesson-status"
                                  className="block text-xs font-medium text-[#45556c]"
                                >
                                  Trạng thái khi lưu
                                </label>
                                <select
                                  id="lesson-status"
                                  value={lessonStatus}
                                  onChange={(event) =>
                                    setLessonStatus(event.target.value as LessonStatus)
                                  }
                                  className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                >
                                  <option value="PUBLISHED">Đã xuất bản</option>
                                  <option value="DRAFT">Bản nháp</option>
                                </select>
                              </div>
                            </div>
                          </details>
                        </>
                      ) : null}
                    </section>
                  ) : null}

                  {lessonEditorTab === "resources" ? (
                    <section
                      className="max-w-[680px] space-y-6"
                      aria-labelledby="lesson-resources-title"
                    >
                      <div>
                        <h3
                          id="lesson-resources-title"
                          className="text-base font-semibold text-primary"
                        >
                          Tài liệu bài học
                        </h3>
                        <p className="mt-1 text-[13px] leading-5 text-[#62748e]">
                          {lessonType === "VIDEO"
                            ? "Hãy tải lên video, các tài liệu hỗ trợ và hình thu nhỏ cho bài học này."
                            : lessonType === "ASSIGNMENT"
                              ? "Hãy tải lên tài liệu bài tập và hình thu nhỏ cho học viên."
                              : "Hãy tải lên các tài liệu hỗ trợ và hình thu nhỏ cho bài học này."}
                        </p>
                      </div>

                      {lessonType === "VIDEO" ? (
                        <>
                          <LessonFileDropzone
                            id="lesson-video-file"
                            label="Video bài học"
                            hint={`Tải lên MP4 hoặc WebM (tối đa 2 GB)${editingLesson ? ". Chọn tệp mới để thay video hiện tại." : ""}`}
                            accept="video/mp4,video/webm,.mp4,.webm"
                            icon={<Video className="h-6 w-6" aria-hidden="true" />}
                            file={lessonVideoFile}
                            disabled={lessonFormLoading}
                            onFileChange={(file) => {
                              setLessonVideoFile(file);
                              setLessonFormError(null);
                            }}
                          />
                          {pendingVideoLessonId ? (
                            <p className="-mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                              Bài học đã được tạo nhưng video chưa hoàn tất. Chọn lại tệp để thử tải
                              lên lần nữa.
                            </p>
                          ) : null}
                          <LessonFileDropzone
                            id="lesson-supporting-file"
                            label="Tài liệu bổ trợ"
                            hint="Tải lên PDF, Word hoặc tệp văn bản"
                            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                            icon={<FileIcon className="h-6 w-6" aria-hidden="true" />}
                            file={lessonResourceFile}
                            disabled={lessonFormLoading}
                            onFileChange={setLessonResourceFile}
                          />
                          <LessonFileDropzone
                            id="lesson-thumbnail-file"
                            label="Ảnh Thumbnail"
                            hint="Tải lên JPEG hoặc PNG · Kích thước đề xuất: 1280 × 720"
                            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                            icon={<ImagePlus className="h-6 w-6" aria-hidden="true" />}
                            file={lessonThumbnailFile}
                            disabled={lessonFormLoading}
                            onFileChange={setLessonThumbnailFile}
                          />
                        </>
                      ) : lessonType === "ASSIGNMENT" ? (
                        <>
                          <LessonFileDropzone
                            id="lesson-assignment-file"
                            label="Nội dung bài tập"
                            hint="Tải lên PDF, Word hoặc tệp văn bản"
                            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                            icon={<FileIcon className="h-6 w-6" aria-hidden="true" />}
                            file={lessonResourceFile}
                            disabled={lessonFormLoading}
                            onFileChange={setLessonResourceFile}
                          />
                          <LessonFileDropzone
                            id="lesson-thumbnail-file"
                            label="Ảnh Thumbnail"
                            hint="Tải lên JPEG hoặc PNG · Kích thước đề xuất: 1280 × 720"
                            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                            icon={<ImagePlus className="h-6 w-6" aria-hidden="true" />}
                            file={lessonThumbnailFile}
                            disabled={lessonFormLoading}
                            onFileChange={setLessonThumbnailFile}
                          />
                        </>
                      ) : lessonType === "DOCUMENT" ? (
                        <LessonFileDropzone
                          id="lesson-document-file"
                          label="Tài liệu bài học"
                          hint="Tải lên PDF, Word hoặc tệp văn bản"
                          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          icon={<FileIcon className="h-6 w-6" aria-hidden="true" />}
                          file={lessonResourceFile}
                          disabled={lessonFormLoading}
                          onFileChange={setLessonResourceFile}
                        />
                      ) : (
                        <>
                          <LessonFileDropzone
                            id="lesson-supporting-file"
                            label="Tài liệu bổ trợ"
                            hint="Tải lên PDF, Word hoặc tệp văn bản"
                            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                            icon={<FileIcon className="h-6 w-6" aria-hidden="true" />}
                            file={lessonResourceFile}
                            disabled={lessonFormLoading}
                            onFileChange={setLessonResourceFile}
                          />
                          <LessonFileDropzone
                            id="lesson-thumbnail-file"
                            label="Ảnh Thumbnail"
                            hint="Tải lên JPEG hoặc PNG · Kích thước đề xuất: 1280 × 720"
                            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                            icon={<ImagePlus className="h-6 w-6" aria-hidden="true" />}
                            file={lessonThumbnailFile}
                            disabled={lessonFormLoading}
                            onFileChange={setLessonThumbnailFile}
                          />
                        </>
                      )}
                    </section>
                  ) : null}

                  {lessonEditorTab === "quiz" && lessonType === "QUIZ" ? (
                    lessonType === "QUIZ" && editingLesson ? (
                      <p className="max-w-[680px] rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Không hỗ trợ chỉnh sửa câu hỏi sau khi tạo bài kiểm tra. Phần soạn câu hỏi
                        chỉ khả dụng khi tạo bài mới.
                      </p>
                    ) : (
                      <QuizAuthoringFields
                        questions={quizQuestions}
                        onQuestionsChange={setQuizQuestions}
                        onAddQuestion={() => {
                          const id = nextQuizQuestionId.current++;
                          setQuizQuestions((current) => [...current, createQuizDraftQuestion(id)]);
                        }}
                      />
                    )
                  ) : null}

                  {lessonEditorTab === "assignment" && lessonType === "ASSIGNMENT" ? (
                    <section
                      className="max-w-[680px] space-y-4"
                      aria-labelledby="assignment-editor-title"
                    >
                      <div>
                        <h3
                          id="assignment-editor-title"
                          className="text-base font-semibold text-primary"
                        >
                          Nội dung bài tập
                        </h3>
                        <p className="mt-1 text-[13px] leading-5 text-[#62748e]">
                          Mô tả nhiệm vụ, yêu cầu và thời hạn để học viên hoàn thành bài tập.
                        </p>
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-primary">
                          Mô tả bài tập
                        </label>
                        <div className="mt-2">
                          <RichTextEditor
                            label="Mô tả bài tập"
                            value={assignmentDescription}
                            onChange={setAssignmentDescription}
                            disabled={lessonFormLoading}
                            compact
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="assignment-rubric"
                          className="block text-[13px] font-medium text-primary"
                        >
                          Phiếu chấm điểm
                        </label>
                        <textarea
                          id="assignment-rubric"
                          rows={4}
                          maxLength={5000}
                          value={assignmentRubric}
                          onChange={(event) => setAssignmentRubric(event.target.value)}
                          placeholder={
                            "Liệt kê các tiêu chí dùng để đánh giá bài nộp.\nVí dụ: Độ chính xác (40%), Độ rõ ràng (30%), Tính độc đáo (30%)..."
                          }
                          className="focus-ring mt-2 min-h-[112px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] leading-5 text-heading placeholder:text-slate-400"
                        />
                      </div>
                      <div className="rounded-xl border border-primary/30 bg-emerald-50 px-4 py-3.5">
                        <h4 className="text-[13px] font-semibold text-primary">
                          Tiêu chí đánh giá
                        </h4>
                        <p className="mt-1 text-xs leading-[18px] text-emerald-700">
                          Ghi rõ tiêu chí và trọng số để việc chấm bài nhất quán, dễ hiểu với học
                          viên.
                        </p>
                      </div>
                      <LessonFileDropzone
                        id="assignment-reference-file"
                        label="Đính kèm tài liệu tham khảo (tùy chọn)"
                        hint="Đính kèm PDF hoặc tài liệu tham khảo cho bài tập"
                        accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        icon={<FileIcon className="h-6 w-6" aria-hidden="true" />}
                        file={assignmentReferenceFile}
                        disabled={lessonFormLoading}
                        onFileChange={setAssignmentReferenceFile}
                      />
                      <fieldset className="pt-1">
                        <legend className="w-full border-b border-slate-100 pb-2 text-[15px] font-semibold text-primary">
                          Thời hạn bài tập
                        </legend>
                        <div className="grid gap-4 pt-3 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="assignment-start-at"
                              className="block text-[13px] font-medium text-heading"
                            >
                              Ngày bắt đầu
                            </label>
                            <input
                              id="assignment-start-at"
                              type="datetime-local"
                              value={assignmentStartAt}
                              onChange={(event) => setAssignmentStartAt(event.target.value)}
                              className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-[#62748e]"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="assignment-end-at"
                              className="block text-[13px] font-medium text-heading"
                            >
                              Ngày kết thúc
                            </label>
                            <input
                              id="assignment-end-at"
                              type="datetime-local"
                              value={assignmentEndAt}
                              onChange={(event) => setAssignmentEndAt(event.target.value)}
                              className="focus-ring mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-[#62748e]"
                            />
                          </div>
                        </div>
                      </fieldset>
                    </section>
                  ) : null}
                </div>
              </form>
            </main>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE SECTION CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      <FeedbackModal
        isOpen={Boolean(deleteSectionTarget)}
        onClose={() => setDeleteSectionTarget(null)}
        title="Xóa chương học?"
        tone="warning"
        confirmText={deleteSectionLoading ? "Đang xóa..." : "Xác nhận xóa"}
        cancelText="Hủy"
        onConfirm={handleDeleteSectionConfirm}
        description={
          deleteSectionTarget
            ? `Bạn có chắc muốn xóa chương "${deleteSectionTarget.title}"? Tất cả ${deleteSectionTarget.totalLessons} bài học bên trong chương này cũng sẽ bị xóa vĩnh viễn.`
            : undefined
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* DELETE LESSON CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      <FeedbackModal
        isOpen={Boolean(deleteLessonTarget)}
        onClose={() => setDeleteLessonTarget(null)}
        title="Xóa bài học?"
        tone="warning"
        confirmText={deleteLessonLoading ? "Đang xóa..." : "Xác nhận xóa"}
        cancelText="Hủy"
        onConfirm={handleDeleteLessonConfirm}
        description={
          deleteLessonTarget
            ? `Bạn có chắc muốn xóa bài học "${deleteLessonTarget.lesson.title}" không?`
            : undefined
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* GENERAL FEEDBACK TOAST */}
      {/* ------------------------------------------------------------- */}
      <FeedbackModal
        isOpen={feedback.isOpen}
        onClose={() => setFeedback((prev) => ({ ...prev, isOpen: false }))}
        title={feedback.title}
        description={feedback.description}
        tone={feedback.tone}
        confirmText="Đã hiểu"
        autoCloseMs={feedback.tone === "success" ? 1400 : 3000}
      />

      {!embedded ? <Footer /> : null}
    </div>
  );
}
