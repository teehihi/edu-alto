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
  FileSpreadsheet,
  FileText,
  Layers,
  Pencil,
  Plus,
  Trash2,
  Video
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { FeedbackModal, type FeedbackTone } from "@/components/ui/feedback-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-client";
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
  updateSection
} from "@/lib/course-structure-client";
import type {
  CourseStructure,
  CourseStructureSection,
  CreateLessonPayload,
  CreateSectionPayload,
  Lesson,
  LessonStatus,
  LessonType,
  UpdateLessonPayload,
  UpdateSectionPayload
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

function getLessonTypeIcon(type: LessonType) {
  switch (type) {
    case "VIDEO":
      return <Video className="h-4 w-4 text-blue-500" />;
    case "DOCUMENT":
      return <FileSpreadsheet className="h-4 w-4 text-amber-500" />;
    case "QUIZ":
      return <FileQuestion className="h-4 w-4 text-purple-500" />;
    case "ASSIGNMENT":
      return <FileCode className="h-4 w-4 text-indigo-500" />;
    case "TEXT":
    default:
      return <FileText className="h-4 w-4 text-emerald-500" />;
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

export interface InstructorCourseCurriculumPageProps {
  courseId: string;
}

export function InstructorCourseCurriculumPage({ courseId }: InstructorCourseCurriculumPageProps) {
  const { accessToken, loading: authLoading } = useAuth();

  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion collapsed state: Map sectionId -> boolean (true = expanded)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Section Modal state
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CourseStructureSection | null>(null);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [sectionFormLoading, setSectionFormLoading] = useState(false);
  const [sectionFormError, setSectionFormError] = useState<string | null>(null);

  // Lesson Modal state
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>("TEXT");
  const [lessonTextContent, setLessonTextContent] = useState("");
  const [lessonDurationMinutes, setLessonDurationMinutes] = useState<string>("10");
  const [lessonIsPreview, setLessonIsPreview] = useState(false);
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>("PUBLISHED");
  const [lessonFormLoading, setLessonFormLoading] = useState(false);
  const [lessonFormError, setLessonFormError] = useState<string | null>(null);

  // Delete Section Modal state
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<CourseStructureSection | null>(null);
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
    tone: "success"
  });

  const loadData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourseStructure(courseId, accessToken);
      setStructure(data);

      // Auto expand all sections by default
      const initialExpanded: Record<string, boolean> = {};
      data.sections.forEach((sec) => {
        initialExpanded[sec.id] = true;
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
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, loadData]);

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId]
    }));
  };

  // -------------------------------------------------------------
  // SECTION CRUD HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionTitle("");
    setSectionDescription("");
    setSectionFormError(null);
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec: CourseStructureSection) => {
    setEditingSection(sec);
    setSectionTitle(sec.title);
    setSectionDescription(sec.description || "");
    setSectionFormError(null);
    setSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionTitle.trim()) {
      setSectionFormError("Vui lòng nhập tên chương học");
      return;
    }

    setSectionFormLoading(true);
    setSectionFormError(null);
    try {
      if (editingSection) {
        // Update
        const payload: UpdateSectionPayload = {
          title: sectionTitle.trim(),
          description: sectionDescription.trim() || null
        };
        await updateSection(courseId, editingSection.id, payload, accessToken);
      } else {
        // Create
        const payload: CreateSectionPayload = {
          title: sectionTitle.trim(),
          description: sectionDescription.trim() || null
        };
        await createSection(courseId, payload, accessToken);
      }

      setSectionModalOpen(false);
      setFeedback({
        isOpen: true,
        title: editingSection ? "Đã cập nhật chương học" : "Đã tạo chương học mới",
        tone: "success"
      });
      await loadData();
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

  const handleDeleteSectionConfirm = async () => {
    if (!deleteSectionTarget) return;
    setDeleteSectionLoading(true);
    try {
      await deleteSection(courseId, deleteSectionTarget.id, accessToken);
      setDeleteSectionTarget(null);
      setFeedback({
        isOpen: true,
        title: "Đã xóa chương học thành công",
        tone: "success"
      });
      await loadData();
    } catch (err) {
      setFeedback({
        isOpen: true,
        title: "Xóa chương học thất bại",
        description: err instanceof ApiClientError ? err.message : "Vui lòng thử lại sau.",
        tone: "error"
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
      position: idx + 1
    }));

    // Optimistic state
    setStructure({
      ...structure,
      sections: newSections
    });

    try {
      await reorderSections(courseId, { items }, accessToken);
    } catch (err) {
      // Rollback on error
      await loadData();
      setFeedback({
        isOpen: true,
        title: "Thay đổi thứ tự thất bại",
        description: "Không thể lưu thứ tự chương học mới. Đã hoàn tác.",
        tone: "error"
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
    setLessonTextContent("");
    setLessonDurationMinutes("10");
    setLessonIsPreview(false);
    setLessonStatus("PUBLISHED");
    setLessonFormError(null);
    setLessonModalOpen(true);
  };

  const handleOpenEditLesson = (secId: string, lesson: Lesson) => {
    setTargetSectionId(secId);
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || "");
    setLessonType(lesson.type);
    setLessonTextContent(lesson.textContent || "");
    setLessonDurationMinutes(
      lesson.videoDurationSeconds ? String(Math.round(lesson.videoDurationSeconds / 60)) : "0"
    );
    setLessonIsPreview(lesson.isPreview);
    setLessonStatus(lesson.status);
    setLessonFormError(null);
    setLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSectionId) return;
    if (!lessonTitle.trim()) {
      setLessonFormError("Vui lòng nhập tên bài học");
      return;
    }

    const durationSeconds = Number(lessonDurationMinutes) > 0 ? Number(lessonDurationMinutes) * 60 : 0;

    setLessonFormLoading(true);
    setLessonFormError(null);
    try {
      if (editingLesson) {
        const payload: UpdateLessonPayload = {
          title: lessonTitle.trim(),
          description: lessonDescription.trim() || null,
          type: lessonType,
          textContent: lessonTextContent.trim() || null,
          videoDurationSeconds: durationSeconds,
          isPreview: lessonIsPreview,
          status: lessonStatus
        };
        await updateLesson(courseId, targetSectionId, editingLesson.id, payload, accessToken);
      } else {
        const payload: CreateLessonPayload = {
          title: lessonTitle.trim(),
          description: lessonDescription.trim() || null,
          type: lessonType,
          textContent: lessonTextContent.trim() || null,
          videoDurationSeconds: durationSeconds,
          isPreview: lessonIsPreview,
          status: lessonStatus
        };
        await createLesson(courseId, targetSectionId, payload, accessToken);
      }

      setLessonModalOpen(false);
      setFeedback({
        isOpen: true,
        title: editingLesson ? "Đã cập nhật bài học" : "Đã tạo bài học mới",
        tone: "success"
      });
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
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
        accessToken
      );
      setDeleteLessonTarget(null);
      setFeedback({
        isOpen: true,
        title: "Đã xóa bài học thành công",
        tone: "success"
      });
      await loadData();
    } catch (err) {
      setFeedback({
        isOpen: true,
        title: "Xóa bài học thất bại",
        description: err instanceof ApiClientError ? err.message : "Vui lòng thử lại sau.",
        tone: "error"
      });
    } finally {
      setDeleteLessonLoading(false);
    }
  };

  const handleMoveLesson = async (
    sectionId: string,
    lessonIndex: number,
    direction: "up" | "down"
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
      position: idx + 1
    }));

    // Optimistic update
    const updatedSections = structure.sections.map((s) =>
      s.id === sectionId ? { ...s, lessons: newLessons } : s
    );
    setStructure({
      ...structure,
      sections: updatedSections
    });

    try {
      await reorderLessons(courseId, sectionId, { items }, accessToken);
    } catch (err) {
      await loadData();
      setFeedback({
        isOpen: true,
        title: "Thay đổi thứ tự bài học thất bại",
        description: "Không thể lưu thứ tự bài học mới. Đã hoàn tác.",
        tone: "error"
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FBFA] text-ink antialiased">
      <AppHeader />

      <main className="flex-1 pb-24 pt-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs & Navigation */}
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4 text-slate-500" />
                  <span>Xem trang khóa học</span>
                </Link>
              </div>
            )}
          </div>

          {/* Hero / Header Card */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
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
                  Thiết kế cấu trúc chương học, bài giảng và sắp xếp thứ tự phân phối nội dung cho học viên.
                </p>
              </div>

              {/* Action */}
              <div className="flex shrink-0 items-center gap-3">
                <Button
                  onClick={handleOpenCreateSection}
                  className="rounded-xl shadow-xs"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm chương mới</span>
                </Button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            {structure && (
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
              <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
                <h3 className="mt-2 text-base font-semibold text-rose-900">{error}</h3>
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={loadData}>
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
                  Hãy bắt đầu xây dựng khóa học bằng cách tạo chương đầu tiên, sau đó thêm các bài học vào giáo trình.
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
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition duration-200 hover:border-slate-300"
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
                            <h3 className="mt-1 text-base font-bold text-heading">
                              {sec.title}
                            </h3>
                            {sec.description && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                                {sec.description}
                              </p>
                            )}
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
                                          {lesson.videoDurationSeconds && lesson.videoDurationSeconds > 0 ? (
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
                                        onClick={() =>
                                          handleMoveLesson(sec.id, lessonIndex, "up")
                                        }
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
                                            lesson
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
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSectionModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
            <h3 className="text-xl font-bold text-heading">
              {editingSection ? "Chỉnh sửa chương học" : "Thêm chương học mới"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Nhập thông tin tiêu đề và mô tả ngắn cho chương học.
            </p>

            <form onSubmit={handleSaveSection} className="mt-6 space-y-4">
              {sectionFormError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  {sectionFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Tên chương học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="Ví dụ: Giới thiệu khóa học và cài đặt môi trường"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-heading shadow-2xs placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Mô tả chương học (Tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={sectionDescription}
                  onChange={(e) => setSectionDescription(e.target.value)}
                  placeholder="Mô tả mục tiêu và nội dung học viên sẽ đạt được..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-heading shadow-2xs placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setSectionModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" size="md" loading={sectionFormLoading}>
                  {editingSection ? "Lưu thay đổi" : "Tạo chương"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LESSON FORM MODAL */}
      {/* ------------------------------------------------------------- */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setLessonModalOpen(false)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
            <h3 className="text-xl font-bold text-heading">
              {editingLesson ? "Chỉnh sửa bài học" : "Thêm bài học mới"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Soạn thảo nội dung bài học, loại học liệu và các thiết lập hiển thị.
            </p>

            <form onSubmit={handleSaveLesson} className="mt-6 space-y-4">
              {lessonFormError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  {lessonFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Tên bài học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ví dụ: Giới thiệu cú pháp TypeScript căn bản"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-heading shadow-2xs placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Loại bài học
                  </label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-heading shadow-2xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="TEXT">Bài đọc văn bản (Text)</option>
                    <option value="VIDEO">Video bài giảng</option>
                    <option value="DOCUMENT">Tài liệu đính kèm</option>
                    <option value="QUIZ">Trắc nghiệm nhanh</option>
                    <option value="ASSIGNMENT">Bài tập thực hành</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Thời lượng ước tính (phút)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={lessonDurationMinutes}
                    onChange={(e) => setLessonDurationMinutes(e.target.value)}
                    placeholder="10"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-heading shadow-2xs placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Mô tả bài học (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  placeholder="Tóm tắt ngắn gọn nội dung bài học..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-heading shadow-2xs placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Text content field */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nội dung bài học
                  </label>
                  <span className="text-xs text-muted">
                    {lessonTextContent.length} ký tự
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={lessonTextContent}
                  onChange={(e) => setLessonTextContent(e.target.value)}
                  placeholder="Nhập nội dung bài đọc, ghi chú hướng dẫn, code sample hoặc liên kết tài liệu tại đây..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm text-heading shadow-2xs placeholder:font-sans placeholder:text-slate-400 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={lessonIsPreview}
                    onChange={(e) => setLessonIsPreview(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-semibold text-heading">
                      Cho phép học thử
                    </span>
                    <p className="text-xs text-muted">
                      Học viên chưa mua khóa học vẫn xem được bài này
                    </p>
                  </div>
                </label>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Trạng thái
                  </label>
                  <select
                    value={lessonStatus}
                    onChange={(e) => setLessonStatus(e.target.value as LessonStatus)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-heading focus:border-primary focus:outline-hidden"
                  >
                    <option value="PUBLISHED">Đã xuất bản (Công khai)</option>
                    <option value="DRAFT">Bản nháp (Ẩn)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setLessonModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" size="md" loading={lessonFormLoading}>
                  {editingLesson ? "Lưu thay đổi" : "Tạo bài học"}
                </Button>
              </div>
            </form>
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
        autoCloseMs={3000}
      />

      <Footer />
    </div>
  );
}
