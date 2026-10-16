"use client";

import {
  BookOpen,
  Check,
  FilePlus2,
  FileText,
  HelpCircle,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEventHandler } from "react";
import { createPortal } from "react-dom";
import { GuidedTour, useGuidedTour } from "@/components/ui/guided-tour";
import {
  QUIZ_GUIDED_TOUR_STEPS,
  QUIZ_TOUR_STORAGE_KEY,
} from "@/features/instructor/quiz-guided-tour";
import { courseDescriptionToText } from "@/lib/course-description";
import type { LessonAttachment } from "@/types/lesson-attachment";

export type QuizDraftOption = { label: string; correct: boolean };
export type QuizDraftQuestion = { id: number; prompt: string; options: QuizDraftOption[] };

export function createQuizDraftQuestion(id: number): QuizDraftQuestion {
  return {
    id,
    prompt: "",
    options: [
      { label: "", correct: true },
      { label: "", correct: false },
      { label: "", correct: false },
      { label: "", correct: false },
    ],
  };
}

type Props = {
  lessonTitle: string;
  lessonDescription: string;
  lessonContent: string;
  attachments: LessonAttachment[];
  pendingFile: File | null;
  pendingFileVisibleToStudents: boolean;
  questions: QuizDraftQuestion[];
  passingScore: string;
  createSubtests: boolean;
  questionsPerAttempt: string;
  durationMinutes: string;
  onPassingScoreChange: (value: string) => void;
  onCreateSubtestsChange: (value: boolean) => void;
  onQuestionsPerAttemptChange: (value: string) => void;
  onDurationMinutesChange: (value: string) => void;
  onQuestionsChange: (update: (current: QuizDraftQuestion[]) => QuizDraftQuestion[]) => void;
  onAddQuestion: () => void;
  onGenerateQuestions: (selection: {
    includeTitle: boolean;
    includeDescription: boolean;
    includeContent: boolean;
    attachmentIds: string[];
    sourceFile: File | null;
    pendingFileVisibleToStudents: boolean;
    focus: string;
    questionCount: number;
  }) => Promise<QuizDraftQuestion[]>;
  onUploadSourceFile: (file: File, visibleToStudents: boolean) => Promise<LessonAttachment | null>;
  onPendingFileVisibilityChange: (visibleToStudents: boolean) => void;
  onClearPendingFile: () => void;
  onAttachmentVisibilityChange: (attachmentId: string, visibleToStudents: boolean) => Promise<void>;
  disabled?: boolean;
};

const optionLabels = ["A", "B", "C", "D", "E", "F"];
const maxAiSourceFileBytes = 5 * 1024 * 1024;

export function QuizAuthoringFields({
  lessonTitle,
  lessonDescription,
  lessonContent,
  attachments,
  pendingFile,
  pendingFileVisibleToStudents,
  questions,
  passingScore,
  createSubtests,
  questionsPerAttempt,
  durationMinutes,
  onPassingScoreChange,
  onCreateSubtestsChange,
  onQuestionsPerAttemptChange,
  onDurationMinutesChange,
  onQuestionsChange,
  onAddQuestion,
  onGenerateQuestions,
  onUploadSourceFile,
  onPendingFileVisibilityChange,
  onClearPendingFile,
  onAttachmentVisibilityChange,
  disabled = false,
}: Props) {
  const [isGenerationOpen, setIsGenerationOpen] = useState(false);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(true);
  const [includeContent, setIncludeContent] = useState(true);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [includePendingFile, setIncludePendingFile] = useState(true);
  const [newFileVisibleToStudents, setNewFileVisibleToStudents] = useState(true);
  const [focus, setFocus] = useState("");
  const [generationCount, setGenerationCount] = useState("5");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [updatingVisibilityIds, setUpdatingVisibilityIds] = useState<string[]>([]);
  const controlsDisabled = disabled || isGenerating || isUploadingSource;
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const isGeneratingRef = useRef(isGenerating);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  const [showTourToast, setShowTourToast] = useState(false);
  const {
    isOpen: isTourOpen,
    currentStep: currentTourStep,
    startTour,
    closeTour,
    completeTour,
    skipTour,
    goToStep: setTourStep,
  } = useGuidedTour({
    steps: QUIZ_GUIDED_TOUR_STEPS,
    storageKey: QUIZ_TOUR_STORAGE_KEY,
    autoStart: true,
    onComplete: () => {
      setShowTourToast(true);
      setTimeout(() => setShowTourToast(false), 4000);
    },
    onSkip: () => {
      setShowTourToast(true);
      setTimeout(() => setShowTourToast(false), 4000);
    },
  });

  useEffect(() => {
    if (!isGenerationOpen) return;

    const originalOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isGeneratingRef.current) {
        event.preventDefault();
        setIsGenerationOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]',
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
  }, [isGenerationOpen]);

  const openGenerationOptions = () => {
    setIncludeTitle(Boolean(lessonTitle.trim()));
    setIncludeDescription(Boolean(courseDescriptionToText(lessonDescription)));
    setIncludeContent(Boolean(courseDescriptionToText(lessonContent)));
    setSelectedAttachmentIds(
      attachments
        .filter((attachment) => attachment.contentLength <= maxAiSourceFileBytes)
        .map((attachment) => attachment.id),
    );
    setIncludePendingFile(pendingFile !== null && pendingFile.size <= maxAiSourceFileBytes);
    setNewFileVisibleToStudents(pendingFileVisibleToStudents);
    setFocus("");
    setGenerationCount("5");
    setGenerationError(null);
    setIsGenerationOpen(true);
  };

  const uploadSourceFile = async (file: File) => {
    setGenerationError(null);
    setIsUploadingSource(true);
    try {
      const uploadedAttachment = await onUploadSourceFile(file, newFileVisibleToStudents);
      if (uploadedAttachment) {
        setSelectedAttachmentIds((current) =>
          current.includes(uploadedAttachment.id) ? current : [...current, uploadedAttachment.id],
        );
        setIncludePendingFile(false);
      } else {
        setIncludePendingFile(true);
      }
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Chưa thể tải tài liệu lên. Vui lòng thử lại.",
      );
    } finally {
      setIsUploadingSource(false);
    }
  };

  const handleSourceFileSelection = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void uploadSourceFile(file);
    if (sourceFileInputRef.current) sourceFileInputRef.current.value = "";
  };

  const changePendingFileVisibility = (visibleToStudents: boolean) => {
    setNewFileVisibleToStudents(visibleToStudents);
    onPendingFileVisibilityChange(visibleToStudents);
  };

  const changeAttachmentVisibility = async (attachmentId: string, visibleToStudents: boolean) => {
    setGenerationError(null);
    setUpdatingVisibilityIds((current) => [...current, attachmentId]);
    try {
      await onAttachmentVisibilityChange(attachmentId, visibleToStudents);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Chưa thể cập nhật hiển thị tài liệu.",
      );
    } finally {
      setUpdatingVisibilityIds((current) => current.filter((id) => id !== attachmentId));
    }
  };

  const closeGenerationOptions = () => {
    if (!isGenerating) setIsGenerationOpen(false);
  };

  const generateQuestions = async () => {
    const count = Number(generationCount);
    const hasTextSource = Boolean(
      (includeTitle && lessonTitle.trim()) ||
      (includeDescription && courseDescriptionToText(lessonDescription)) ||
      (includeContent && courseDescriptionToText(lessonContent)),
    );
    const hasResourceSource =
      selectedAttachmentIds.length > 0 ||
      (includePendingFile && pendingFile !== null && pendingFile.size > 0);
    if (!hasTextSource && !hasResourceSource) {
      setGenerationError("Hãy chọn ít nhất một nguồn để tạo câu hỏi.");
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      setGenerationError("Số câu hỏi cần nằm trong khoảng từ 1 đến 20.");
      return;
    }
    const existingCount = questions.filter(
      (question) =>
        question.prompt.trim() || question.options.some((option) => option.label.trim()),
    ).length;
    if (existingCount + count > 100) {
      setGenerationError("Quiz chỉ có thể có tối đa 100 câu hỏi. Hãy giảm số câu được tạo.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const generated = await onGenerateQuestions({
        includeTitle,
        includeDescription,
        includeContent,
        attachmentIds: selectedAttachmentIds,
        sourceFile: includePendingFile ? pendingFile : null,
        pendingFileVisibleToStudents: newFileVisibleToStudents,
        focus,
        questionCount: count,
      });
      onQuestionsChange((current) => {
        const completed = current.filter(
          (question) =>
            question.prompt.trim() || question.options.some((option) => option.label.trim()),
        );
        return [...completed, ...generated].slice(0, 100);
      });
      setIsGenerationOpen(false);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : "Chưa thể tạo câu hỏi. Vui lòng thử lại.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {isGenerationOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/50 p-1.5 backdrop-blur-sm sm:p-6"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) closeGenerationOptions();
              }}
            >
              <section
                ref={dialogRef}
                id="quiz-ai-source-options"
                role="dialog"
                aria-modal="true"
                aria-labelledby="quiz-ai-dialog-title"
                aria-describedby="quiz-ai-dialog-description"
                tabIndex={-1}
                className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
              >
                <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-3.5 sm:gap-4 sm:px-6 sm:py-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 id="quiz-ai-dialog-title" className="text-lg font-semibold text-heading">
                        Tạo câu hỏi bằng AI
                      </h2>
                      <p
                        id="quiz-ai-dialog-description"
                        className="mt-1 text-sm leading-5 text-muted"
                      >
                        Chọn nguồn học liệu và số câu hỏi. Bạn sẽ xem lại bản nháp trước khi lưu
                        quiz.
                      </p>
                    </div>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={closeGenerationOptions}
                    disabled={isGenerating}
                    aria-label="Đóng tạo câu hỏi bằng AI"
                    className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 active:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </header>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:space-y-5 sm:px-6 sm:py-5">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                      <h3 className="text-sm font-semibold text-heading">Nguồn từ bài học</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {[
                        {
                          id: "quiz-ai-include-title",
                          title: "Tên bài học",
                          description: lessonTitle.trim() || "Chưa nhập tên bài học",
                          checked: includeTitle,
                          available: Boolean(lessonTitle.trim()),
                          onChange: setIncludeTitle,
                        },
                        {
                          id: "quiz-ai-include-description",
                          title: "Mô tả",
                          description:
                            courseDescriptionToText(lessonDescription) || "Chưa nhập mô tả",
                          checked: includeDescription,
                          available: Boolean(courseDescriptionToText(lessonDescription)),
                          onChange: setIncludeDescription,
                        },
                        {
                          id: "quiz-ai-include-content",
                          title: "Nội dung",
                          description:
                            courseDescriptionToText(lessonContent) || "Chưa nhập nội dung",
                          checked: includeContent,
                          available: Boolean(courseDescriptionToText(lessonContent)),
                          onChange: setIncludeContent,
                        },
                      ].map((source) => (
                        <label
                          key={source.id}
                          htmlFor={source.id}
                          className={`flex min-h-[88px] cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition sm:min-h-[104px] sm:gap-3 sm:p-3 ${
                            source.checked
                              ? "border-primary/50 bg-primary-soft/60"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          } ${!source.available || controlsDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <SourceCheckbox
                            id={source.id}
                            checked={source.checked}
                            disabled={controlsDisabled || !source.available}
                            onChange={(event) => source.onChange(event.target.checked)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-heading">
                              {source.title}
                            </span>
                            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted">
                              {source.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                      <h3 className="text-sm font-semibold text-heading">Tài liệu bổ trợ</h3>
                    </div>
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs leading-5 text-muted">
                          Tải PDF, Word, PowerPoint, Excel hoặc văn bản, tối đa 5 MB mỗi tệp.
                        </p>
                        <input
                          ref={sourceFileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                          className="sr-only"
                          aria-label="Chọn tài liệu bổ trợ"
                          disabled={controlsDisabled}
                          onChange={(event) => handleSourceFileSelection(event.currentTarget.files)}
                        />
                        <button
                          type="button"
                          disabled={controlsDisabled || Boolean(pendingFile)}
                          onClick={() => sourceFileInputRef.current?.click()}
                          className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-heading/20 bg-white px-3 text-sm font-semibold text-heading transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {isUploadingSource ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Upload className="h-4 w-4" aria-hidden="true" />
                          )}
                          {isUploadingSource
                            ? "Đang tải lên..."
                            : pendingFile
                              ? "Lưu bài học để thêm tệp"
                              : "Tải tài liệu lên"}
                        </button>
                      </div>
                      {attachments.length === 0 && !pendingFile ? (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-muted">
                          Chưa có tài liệu bổ trợ. Chọn tệp để tải lên và dùng làm nguồn tạo câu
                          hỏi.
                        </p>
                      ) : null}
                      {attachments.map((attachment) => {
                        const tooLarge = attachment.contentLength > maxAiSourceFileBytes;
                        const checked = selectedAttachmentIds.includes(attachment.id);
                        return (
                          <div
                            key={attachment.id}
                            className={`rounded-lg border p-3 transition ${
                              checked
                                ? "border-primary/40 bg-white"
                                : "border-transparent bg-white/60"
                            } ${tooLarge ? "opacity-70" : ""}`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <FileText
                                className="h-4 w-4 shrink-0 text-slate-400"
                                aria-hidden="true"
                              />
                              <span className="min-w-0 flex-1 break-words text-sm font-medium leading-5 text-heading">
                                {attachment.fileName}
                              </span>
                              <span className="shrink-0 text-xs text-muted">
                                {tooLarge ? "Vượt 5 MB" : formatFileSize(attachment.contentLength)}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5">
                              <label className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-muted">
                                <SourceCheckbox
                                  aria-label={`Dùng ${attachment.fileName} làm nguồn tạo câu hỏi`}
                                  checked={checked}
                                  disabled={controlsDisabled || tooLarge}
                                  onChange={(event) =>
                                    setSelectedAttachmentIds((current) =>
                                      event.target.checked
                                        ? [...current, attachment.id]
                                        : current.filter((id) => id !== attachment.id),
                                    )
                                  }
                                />
                                Dùng làm nguồn
                              </label>
                              <label className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-muted">
                                <SourceCheckbox
                                  checked={attachment.visibleToStudents}
                                  disabled={
                                    controlsDisabled ||
                                    updatingVisibilityIds.includes(attachment.id)
                                  }
                                  onChange={(event) =>
                                    void changeAttachmentVisibility(
                                      attachment.id,
                                      event.target.checked,
                                    )
                                  }
                                />
                                Hiển thị với học viên
                              </label>
                            </div>
                          </div>
                        );
                      })}
                      {pendingFile ? (
                        <div
                          className={`rounded-lg border p-3 transition ${
                            includePendingFile
                              ? "border-primary/40 bg-white"
                              : "border-transparent bg-white/60"
                          } ${pendingFile.size > maxAiSourceFileBytes ? "opacity-70" : ""}`}
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <FilePlus2
                              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm font-medium leading-5 text-heading">
                                {pendingFile.name}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-muted">
                                {pendingFile.size > maxAiSourceFileBytes
                                  ? "Vượt 5 MB"
                                  : formatFileSize(pendingFile.size)}
                                <span aria-hidden="true"> · </span>
                                Tệp sẽ tải lên khi lưu bài học
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label={`Bỏ tệp ${pendingFile.name}`}
                              disabled={controlsDisabled}
                              onClick={onClearPendingFile}
                              className="focus-ring -mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5">
                            <label className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-muted">
                              <SourceCheckbox
                                aria-label={`Dùng ${pendingFile.name} làm nguồn tạo câu hỏi`}
                                checked={includePendingFile}
                                disabled={
                                  controlsDisabled || pendingFile.size > maxAiSourceFileBytes
                                }
                                onChange={(event) => setIncludePendingFile(event.target.checked)}
                              />
                              Dùng làm nguồn
                            </label>
                            <label className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-muted">
                              <SourceCheckbox
                                checked={newFileVisibleToStudents}
                                disabled={controlsDisabled}
                                onChange={(event) =>
                                  changePendingFileVisibility(event.target.checked)
                                }
                              />
                              Hiển thị với học viên
                            </label>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {attachments.some(
                    (attachment) =>
                      selectedAttachmentIds.includes(attachment.id) &&
                      !attachment.visibleToStudents,
                  ) ||
                  (includePendingFile && pendingFile !== null && !newFileVisibleToStudents) ? (
                    <p className="-mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                      Có tài liệu nguồn bị ẩn với học viên. AI sẽ tạo câu hỏi tự đủ ngữ cảnh, không
                      yêu cầu học viên mở tệp.
                    </p>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
                    <div>
                      <label
                        htmlFor="quiz-ai-focus"
                        className="block text-sm font-medium text-heading"
                      >
                        Trọng tâm câu hỏi{" "}
                        <span className="font-normal text-muted">(không bắt buộc)</span>
                      </label>
                      <input
                        id="quiz-ai-focus"
                        type="text"
                        maxLength={500}
                        value={focus}
                        disabled={controlsDisabled}
                        onChange={(event) => setFocus(event.target.value)}
                        placeholder="Ví dụ: vòng đời ứng dụng di động"
                        className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-heading placeholder:text-slate-400"
                      />
                      <p className="mt-1.5 text-xs leading-5 text-muted">
                        Dùng trọng tâm để ưu tiên đoạn liên quan trong nguồn đã chọn.
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="quiz-ai-question-count"
                        className="block text-sm font-medium text-heading"
                      >
                        Số câu hỏi
                      </label>
                      <input
                        id="quiz-ai-question-count"
                        type="number"
                        min="1"
                        max="20"
                        value={generationCount}
                        disabled={controlsDisabled}
                        onChange={(event) => setGenerationCount(event.target.value)}
                        className="focus-ring mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-heading"
                      />
                      <p className="mt-1.5 text-xs text-muted">Từ 1 đến 20 câu</p>
                    </div>
                  </div>
                </div>

                <footer className="border-t border-slate-100 bg-white px-3 py-3 sm:px-6 sm:py-4">
                  {generationError ? (
                    <p
                      role="alert"
                      className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    >
                      {generationError}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={closeGenerationOptions}
                      className="focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      disabled={controlsDisabled}
                      onClick={() => void generateQuestions()}
                      className="focus-ring inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark active:bg-primary-dark disabled:cursor-wait disabled:opacity-60 sm:flex-initial sm:px-4"
                    >
                      {isGenerating ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                      )}
                      {isGenerating ? "Đang tạo câu hỏi..." : "Tạo bản nháp câu hỏi"}
                    </button>
                  </div>
                </footer>
              </section>
            </div>,
            document.body,
          )
        : null}
      <section aria-label="Câu hỏi bài kiểm tra" className="max-w-[996px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[560px]">
            <h3 className="text-base font-semibold text-primary">Câu hỏi ôn tập</h3>
            <p className="mt-1 text-[13px] leading-5 text-[#62748e]">
              Soạn thảo câu hỏi trắc nghiệm, cấu hình điểm đạt và hoàn tất bài học.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => startTour(0)}
              className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
            >
              <HelpCircle className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Hướng dẫn
            </button>
            <button
              type="button"
              disabled={controlsDisabled}
              aria-expanded={isGenerationOpen}
              aria-controls="quiz-ai-source-options"
              onClick={() =>
                isGenerationOpen ? closeGenerationOptions() : openGenerationOptions()
              }
              className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-heading bg-heading px-3 text-xs font-medium text-white transition hover:bg-heading/90 active:bg-heading/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Tạo bằng AI
            </button>
            <button
              type="button"
              data-tour="quiz-add-question-btn"
              disabled={controlsDisabled || questions.length >= 100}
              onClick={onAddQuestion}
              className="focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary bg-primary px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-primary-dark active:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Thêm câu hỏi
            </button>
          </div>
        </div>

        <div
          data-tour="quiz-settings"
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label
              htmlFor="quiz-passing-score"
              className="block text-xs font-medium text-[#52647d]"
            >
              Điểm đạt (%)
            </label>
            <input
              id="quiz-passing-score"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={passingScore}
              disabled={controlsDisabled}
              onChange={(event) => onPassingScoreChange(event.target.value)}
              className="focus-ring mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-heading disabled:bg-slate-100"
            />
            <p className="mt-1.5 text-xs text-[#62748e]">Mức điểm cần đạt để hoàn thành bài.</p>
          </div>
          <div>
            <p className="block text-xs font-medium text-[#52647d]">Kiểu đề</p>
            <label
              className={`mt-1.5 flex h-9 items-center gap-3 rounded-lg border px-3 transition ${controlsDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary/50"} ${createSubtests ? "border-primary/50 bg-[#f5fbf9]" : "border-slate-200 bg-white"}`}
            >
              <input
                type="checkbox"
                checked={createSubtests}
                disabled={controlsDisabled}
                onChange={(event) => onCreateSubtestsChange(event.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${createSubtests ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-transparent"}`}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="min-w-0 text-sm font-medium text-[#101a2c]">Tạo đề con</span>
            </label>
            {createSubtests ? (
              <div className="mt-3">
                <label
                  htmlFor="quiz-questions-per-attempt"
                  className="block text-xs font-medium text-[#52647d]"
                >
                  Số câu mỗi đề
                </label>
                <input
                  id="quiz-questions-per-attempt"
                  type="number"
                  min="1"
                  max={questions.length}
                  step="1"
                  value={questionsPerAttempt}
                  disabled={controlsDisabled}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 1) {
                      onQuestionsPerAttemptChange(String(Math.min(value, questions.length)));
                    }
                  }}
                  className="focus-ring mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-heading disabled:bg-slate-100"
                />
                <p className="mt-1.5 text-xs text-[#62748e]">
                  Từ 1 đến {questions.length} câu trong ngân hàng.
                </p>
              </div>
            ) : (
              <p className="mt-1.5 text-xs leading-5 text-[#62748e]">
                Mặc định dùng toàn bộ câu hỏi.
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="quiz-duration-minutes"
              className="block text-xs font-medium text-[#52647d]"
            >
              Thời gian làm bài (phút)
            </label>
            <input
              id="quiz-duration-minutes"
              type="number"
              min="0"
              max="600"
              step="1"
              value={durationMinutes}
              disabled={controlsDisabled}
              onChange={(event) => onDurationMinutesChange(event.target.value)}
              className="focus-ring mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-heading disabled:bg-slate-100"
            />
            <p className="mt-1.5 text-xs text-[#62748e]">
              0 hoặc để trống = không giới hạn thời gian.
            </p>
          </div>
        </div>

        {questions.map((question, questionIndex) => (
          <fieldset
            key={question.id}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#90a1b9]">
                Câu {questionIndex + 1}
              </legend>
              <button
                type="button"
                aria-label={`Xóa câu ${questionIndex + 1}`}
                disabled={controlsDisabled || questions.length <= 1}
                onClick={() =>
                  onQuestionsChange((current) => current.filter((item) => item.id !== question.id))
                }
                className="focus-ring inline-flex size-8 items-center justify-center rounded-md text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <label className="sr-only" htmlFor={`quiz-prompt-${question.id}`}>
              {questionIndex === 0 ? "Nội dung câu hỏi" : `Nội dung câu hỏi ${questionIndex + 1}`}
            </label>
            <input
              id={`quiz-prompt-${question.id}`}
              data-tour={questionIndex === 0 ? "quiz-question-prompt" : undefined}
              type="text"
              maxLength={2000}
              value={question.prompt}
              disabled={controlsDisabled}
              onChange={(event) =>
                onQuestionsChange((current) =>
                  current.map((item) =>
                    item.id === question.id ? { ...item, prompt: event.target.value } : item,
                  ),
                )
              }
              placeholder="Nhập câu hỏi của bạn..."
              className="focus-ring h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-heading placeholder:text-slate-400"
            />

            <div
              data-tour={questionIndex === 0 ? "quiz-options-area" : undefined}
              className="space-y-2"
            >
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-3">
                  <input
                    id={`quiz-correct-${question.id}-${optionIndex}`}
                    data-tour={
                      questionIndex === 0 &&
                      (option.correct ||
                        (!question.options.some((cand) => cand.correct) && optionIndex === 0))
                        ? "quiz-correct-answer"
                        : undefined
                    }
                    type="radio"
                    name={`quiz-correct-${question.id}`}
                    aria-label={`Đáp án đúng câu ${questionIndex + 1}, phương án ${optionLabels[optionIndex]}`}
                    checked={option.correct}
                    disabled={controlsDisabled}
                    onChange={() =>
                      onQuestionsChange((current) =>
                        current.map((item) =>
                          item.id === question.id
                            ? {
                                ...item,
                                options: item.options.map((candidate, candidateIndex) => ({
                                  ...candidate,
                                  correct: candidateIndex === optionIndex,
                                })),
                              }
                            : item,
                        ),
                      )
                    }
                    style={{
                      backgroundImage: option.correct
                        ? "radial-gradient(circle, #20B486 0 38%, transparent 42%)"
                        : undefined,
                    }}
                    className="focus-ring h-4 w-4 shrink-0 appearance-none rounded-full border-2 border-[#98a2b3] bg-white bg-center bg-no-repeat transition-colors checked:border-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label className="sr-only" htmlFor={`quiz-option-${question.id}-${optionIndex}`}>
                    Phương án {optionLabels[optionIndex]} câu {questionIndex + 1}
                  </label>
                  <input
                    id={`quiz-option-${question.id}-${optionIndex}`}
                    type="text"
                    maxLength={500}
                    value={option.label}
                    disabled={controlsDisabled}
                    onChange={(event) =>
                      onQuestionsChange((current) =>
                        current.map((item) =>
                          item.id === question.id
                            ? {
                                ...item,
                                options: item.options.map((candidate, candidateIndex) =>
                                  candidateIndex === optionIndex
                                    ? { ...candidate, label: event.target.value }
                                    : candidate,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    placeholder={`Lựa chọn ${optionLabels[optionIndex]}`}
                    className={`focus-ring h-[38px] min-w-0 flex-1 rounded-lg border px-3 text-[13px] placeholder:text-slate-400 ${
                      option.correct
                        ? "border-emerald-300 bg-emerald-50/80"
                        : "border-slate-200 bg-white"
                    } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
                  />
                  {option.correct ? (
                    <span className="shrink-0 text-[10px] font-semibold uppercase text-emerald-600">
                      Đáp án
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Xóa phương án ${optionLabels[optionIndex]} câu ${questionIndex + 1}`}
                    title={
                      question.options.length <= 2
                        ? "Mỗi câu hỏi cần ít nhất 2 phương án"
                        : `Xóa phương án ${optionLabels[optionIndex]}`
                    }
                    disabled={controlsDisabled || question.options.length <= 2}
                    onClick={() =>
                      onQuestionsChange((current) =>
                        current.map((item) => {
                          if (item.id !== question.id || item.options.length <= 2) return item;
                          const options = item.options.filter((_, index) => index !== optionIndex);
                          if (!options.some((candidate) => candidate.correct)) {
                            options[0] = { ...options[0], correct: true };
                          }
                          return { ...item, options };
                        }),
                      )
                    }
                    className="focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            {question.options.length < 6 ? (
              <button
                type="button"
                disabled={controlsDisabled}
                onClick={() =>
                  onQuestionsChange((current) =>
                    current.map((item) =>
                      item.id === question.id
                        ? { ...item, options: [...item.options, { label: "", correct: false }] }
                        : item,
                    ),
                  )
                }
                className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-primary transition hover:text-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Thêm phương án
              </button>
            ) : null}
          </fieldset>
        ))}
      </section>

      <GuidedTour
        isOpen={isTourOpen}
        steps={QUIZ_GUIDED_TOUR_STEPS}
        currentStep={currentTourStep}
        onStepChange={setTourStep}
        onClose={closeTour}
        onComplete={completeTour}
        onSkip={skipTour}
      />

      {showTourToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-medium text-heading shadow-xl animate-in fade-in slide-in-from-bottom-3"
        >
          <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Hoàn tất hướng dẫn! Bạn có thể xem lại bất cứ lúc nào từ nút <strong>Hướng dẫn</strong>.
          </span>
        </div>
      )}
    </>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type SourceCheckboxProps = {
  id?: string;
  "aria-label"?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  className?: string;
};

function SourceCheckbox({
  id,
  "aria-label": ariaLabel,
  checked,
  disabled = false,
  onChange,
  className = "",
}: SourceCheckboxProps) {
  const visualState = disabled
    ? "border-slate-300 bg-slate-100"
    : checked
      ? "border-primary bg-primary"
      : "border-slate-300 bg-white";

  return (
    <span className={`relative inline-grid size-4 shrink-0 ${className}`}>
      <input
        id={id}
        aria-label={ariaLabel}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0 focus-visible:outline-none disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 grid place-items-center rounded-[4px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-0 ${visualState}`}
      >
        {checked ? (
          <Check
            className={`size-3 ${disabled ? "text-slate-500" : "text-white"}`}
            strokeWidth={3}
          />
        ) : null}
      </span>
    </span>
  );
}
