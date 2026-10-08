import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InstructorCourseCurriculumPage } from "./instructor-course-curriculum-page";
import * as structureClient from "@/lib/course-structure-client";
import * as quizClient from "@/lib/instructor-quiz-client";
import * as videoClient from "@/lib/course-video-client";
import {
  InstructorWorkspaceShell,
  useInstructorWorkspaceSidebar,
} from "@/features/instructor/instructor-workspace-shell";
import type { CourseStructure } from "@/types/course-structure";

function WorkspaceSidebarStateProbe() {
  const sidebar = useInstructorWorkspaceSidebar();
  return (
    <output data-testid="workspace-sidebar-state">
      {sidebar?.sidebarCollapsed ? "collapsed" : "expanded"}
    </output>
  );
}

const mockStructure: CourseStructure = {
  courseId: "c1111111-1111-1111-1111-111111111111",
  courseTitle: "Lập trình TypeScript và React Nâng Cao",
  courseSlug: "lap-trinh-typescript-react",
  totalSections: 2,
  totalLessons: 2,
  totalDurationSeconds: 1200,
  sections: [
    {
      id: "sec-1",
      title: "Chương 1: Giới thiệu căn bản",
      description: "Nền tảng về TypeScript và công cụ lập trình",
      position: 1,
      totalLessons: 1,
      totalDurationSeconds: 600,
      lessons: [
        {
          id: "les-1",
          sectionId: "sec-1",
          title: "Bài 1: Cài đặt NodeJS và Compiler",
          description: "Chuẩn bị môi trường",
          type: "TEXT",
          textContent: "Hướng dẫn cài đặt chi tiết...",
          videoDurationSeconds: 600,
          isPreview: true,
          status: "PUBLISHED",
          position: 1,
          createdAt: "2026-09-23T00:00:00Z",
          updatedAt: "2026-09-23T00:00:00Z",
        },
      ],
    },
    {
      id: "sec-2",
      title: "Chương 2: React Component Design",
      description: "Xây dựng component chuẩn",
      position: 2,
      totalLessons: 1,
      totalDurationSeconds: 600,
      lessons: [
        {
          id: "les-2",
          sectionId: "sec-2",
          title: "Bài 2: Hooks chuyên sâu",
          description: "UseState, UseEffect và custom hooks",
          type: "TEXT",
          textContent: "Phân tích useEffect lifecycle...",
          videoDurationSeconds: 600,
          isPreview: false,
          status: "PUBLISHED",
          position: 1,
          createdAt: "2026-09-23T00:00:00Z",
          updatedAt: "2026-09-23T00:00:00Z",
        },
      ],
    },
  ],
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/instructor/courses/c1111111-1111-1111-1111-111111111111/curriculum",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/layout/app-header", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

vi.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="footer" />,
}));

vi.mock("@/features/auth/auth-client", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      fullName: "Giảng viên A",
      email: "teacher@edualto.com",
      roles: ["INSTRUCTOR"],
    },
    accessToken: "mock-token",
    loading: false,
    isAuthenticated: true,
  }),
}));

describe("InstructorCourseCurriculumPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders course structure, sections, and lessons accurately", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    expect(await screen.findByText(mockStructure.courseTitle)).toBeInTheDocument();
    expect(screen.getByText("2 chương")).toBeInTheDocument();
    expect(screen.getByText("2 bài học")).toBeInTheDocument();
    expect(screen.getByText("20 phút")).toBeInTheDocument();

    expect(screen.getByText("Chương 1: Giới thiệu căn bản")).toBeInTheDocument();
    expect(screen.getByText("Chương 2: React Component Design")).toBeInTheDocument();
    const expandButtons = screen.getAllByRole("button", { name: "Mở rộng chương" });
    await user.click(expandButtons[0]);
    await user.click(screen.getByRole("button", { name: "Mở rộng chương" }));
    expect(screen.getByText("Bài 1: Cài đặt NodeJS và Compiler")).toBeInTheDocument();
    expect(screen.getByText("Bài 2: Hooks chuyên sâu")).toBeInTheDocument();
  });

  it("opens create section modal and submits new section", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const createSectionSpy = vi.spyOn(structureClient, "createSection").mockResolvedValue({
      id: "sec-3",
      courseId: mockStructure.courseId,
      title: "Chương 3: State Management",
      description: "Mô tả chương 3",
      position: 3,
      createdAt: "2026-09-23T00:00:00Z",
      updatedAt: "2026-09-23T00:00:00Z",
    });

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    const addSectionBtn = await screen.findByRole("button", { name: /thêm chương mới/i });
    await user.click(addSectionBtn);

    expect(screen.getByRole("heading", { name: "Thêm chương mới" })).toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText(/giới thiệu khóa học/i);
    await user.type(titleInput, "Chương 3: State Management");

    const submitBtn = screen.getByRole("button", { name: "Lưu chương" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSectionSpy).toHaveBeenCalledWith(
        mockStructure.courseId,
        expect.objectContaining({ title: "Chương 3: State Management" }),
        "mock-token",
      );
    });
  });

  it("synchronizes the chapter editor sidebar with the instructor workspace", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);

    render(
      <InstructorWorkspaceShell>
        <WorkspaceSidebarStateProbe />
        <InstructorCourseCurriculumPage courseId={mockStructure.courseId} />
      </InstructorWorkspaceShell>,
    );

    await screen.findByText(mockStructure.courseTitle);
    await user.click(screen.getAllByTitle("Chỉnh sửa chương")[0]);

    const getEditorToggle = () =>
      document.querySelector<HTMLButtonElement>(
        '#section-editor-global-sidebar button[aria-controls="section-editor-global-sidebar"]',
      );
    const editorToggle = getEditorToggle();
    expect(editorToggle).not.toBeNull();
    expect(screen.getByTestId("workspace-sidebar-state")).toHaveTextContent("expanded");
    expect(document.getElementById("section-editor-structure")).not.toHaveClass("lg:hidden");
    const studentPreview = screen.getByRole("complementary", {
      name: "Giao diện chương trên trang khóa học",
    });
    await user.type(screen.getByLabelText("Giới thiệu"), "Mục tiêu của chương");
    expect(studentPreview).toHaveTextContent("Mục tiêu của chương");
    expect(within(studentPreview).getByText("Giới thiệu", { exact: true })).toBeInTheDocument();
    expect(studentPreview).toHaveTextContent("1 Bài học");
    expect(studentPreview).toHaveTextContent("10 phút");
    expect(studentPreview).toHaveTextContent("Bài 1: Cài đặt NodeJS và Compiler");
    expect(within(studentPreview).queryByText("Chương 1", { exact: true })).not.toBeInTheDocument();

    const accountButton = screen.getByRole("button", {
      name: "Thông tin tài khoản: Giảng viên A",
    });
    await user.click(accountButton);
    const accountDialog = screen.getByRole("dialog", { name: "Tài khoản" });
    expect(accountDialog).toHaveTextContent("Giảng viên A");
    expect(accountDialog).toHaveTextContent("teacher@edualto.com");
    expect(accountDialog).toHaveTextContent("Giảng viên");
    await user.click(within(accountDialog).getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(accountButton).toHaveFocus());

    await user.click(screen.getByRole("tab", { name: "SEO" }));
    const seoPreview = screen.getByRole("complementary", {
      name: "Giao diện chương trên trang khóa học",
    });
    const seoTitleInput = screen.getByLabelText("Tiêu đề SEO");
    await user.clear(seoTitleInput);
    await user.type(seoTitleInput, "SEO chương mới");
    expect(within(seoPreview).getByText("Chương 1: Giới thiệu căn bản")).toBeInTheDocument();
    expect(seoPreview).toHaveTextContent("Tiêu đề và mô tả SEO là metadata tìm kiếm");
    expect(seoPreview).not.toHaveTextContent("SEO chương mới");
    await user.click(screen.getByRole("tab", { name: "Chi tiết" }));

    await user.click(editorToggle!);

    expect(screen.getByTestId("workspace-sidebar-state")).toHaveTextContent("collapsed");
    expect(document.getElementById("section-editor-structure")).not.toHaveClass("lg:hidden");
    const collapsedEditorToggle = getEditorToggle();
    expect(collapsedEditorToggle).toHaveAttribute("aria-label", "Mở rộng thanh bên");
    expect(document.getElementById("section-editor-layout")).toHaveClass(
      "lg:grid-cols-[88px_303px_minmax(0,1fr)]",
    );
    expect(document.getElementById("section-editor-layout")).toHaveClass(
      "lg:grid-rows-[64px_auto]",
    );
    expect(document.getElementById("section-editor-layout")).toHaveClass(
      "transition-[grid-template-columns]",
      "duration-300",
      "ease-in-out",
      "motion-reduce:transition-none",
    );
    expect(document.getElementById("instructor-sidebar")).toHaveClass(
      "lg:w-[88px]",
      "duration-300",
      "ease-in-out",
    );

    await user.click(collapsedEditorToggle!);

    expect(screen.getByTestId("workspace-sidebar-state")).toHaveTextContent("expanded");
    expect(document.getElementById("section-editor-structure")).not.toHaveClass("lg:hidden");
    expect(document.getElementById("section-editor-layout")).toHaveClass(
      "lg:grid-cols-[261px_303px_minmax(0,1fr)]",
    );
    expect(document.getElementById("instructor-sidebar")).toHaveClass("lg:w-[261px]");
  });

  it("opens create lesson modal and submits new lesson", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const createLessonSpy = vi.spyOn(structureClient, "createLesson").mockResolvedValue({
      id: "les-3",
      sectionId: "sec-1",
      title: "Bài mới: TypeScript Generics",
      description: "Mô tả bài học mới",
      type: "TEXT",
      textContent: "Nội dung bài học generics...",
      videoDurationSeconds: 900,
      isPreview: false,
      status: "PUBLISHED",
      position: 2,
      createdAt: "2026-09-23T00:00:00Z",
      updatedAt: "2026-09-23T00:00:00Z",
    });

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    // Click "Thêm bài học" on first section
    const addLessonButtons = await screen.findAllByRole("button", { name: /thêm bài học/i });
    await user.click(addLessonButtons[0]);

    expect(screen.getByText("Thêm bài học mới")).toBeInTheDocument();
    const readingTypeButton = screen.getByRole("button", { name: "Bài đọc" });
    expect(readingTypeButton).toHaveAttribute("aria-pressed", "true");
    expect(readingTypeButton.querySelector("svg")).toHaveClass("text-white");
    const documentTypeButton = screen.getByRole("button", { name: "PDF / Tài liệu" });
    expect(documentTypeButton).toHaveClass("group");
    expect(documentTypeButton.querySelector("svg")).toHaveClass("group-hover:text-primary");
    const titleInput = screen.getByPlaceholderText("Nhập tên bài học");
    await user.type(titleInput, "Bài mới: TypeScript Generics");

    const submitBtn = screen.getByRole("button", { name: "Lưu và xuất bản" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createLessonSpy).toHaveBeenCalledWith(
        mockStructure.courseId,
        "sec-1",
        expect.objectContaining({ title: "Bài mới: TypeScript Generics" }),
        "mock-token",
      );
    });
  });

  it("creates a quiz lesson and submits its questions to the quiz API", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const createLessonSpy = vi.spyOn(structureClient, "createLesson").mockResolvedValue({
      id: "les-quiz",
      sectionId: "sec-1",
      title: "Kiểm tra TypeScript",
      description: null,
      type: "QUIZ",
      textContent: null,
      videoDurationSeconds: 600,
      isPreview: false,
      status: "PUBLISHED",
      position: 2,
      createdAt: "2026-09-23T00:00:00Z",
      updatedAt: "2026-09-23T00:00:00Z",
    });
    const updateLessonSpy = vi.spyOn(structureClient, "updateLesson").mockResolvedValue({
      ...mockStructure.sections[0].lessons[0],
      id: "les-quiz",
      title: "Kiểm tra TypeScript",
      type: "QUIZ",
      status: "PUBLISHED",
      position: 2,
    });
    const createQuizSpy = vi.spyOn(quizClient, "createInstructorQuiz").mockResolvedValue({
      id: "quiz-1",
      lessonId: "les-quiz",
      passingScore: 70,
      questions: [],
    });

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    const addLessonButtons = await screen.findAllByRole("button", { name: /thêm bài học/i });
    await user.click(addLessonButtons[0]);
    await user.type(screen.getByPlaceholderText("Nhập tên bài học"), "Kiểm tra TypeScript");
    await user.click(screen.getByRole("button", { name: "Quiz" }));
    await user.click(screen.getByRole("tab", { name: "Quiz" }));
    await user.click(screen.getByRole("button", { name: "Thêm phương án" }));
    expect(screen.getByPlaceholderText("Lựa chọn E")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xóa phương án E câu 1" }));
    expect(screen.queryByPlaceholderText("Lựa chọn E")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Xóa phương án A câu 1" }));
    expect(screen.getByRole("radio", { name: "Đáp án đúng câu 1, phương án A" })).toBeChecked();
    await user.type(screen.getByLabelText("Nội dung câu hỏi"), "Kiểu nào dùng cho chuỗi?");
    await user.type(screen.getByPlaceholderText("Lựa chọn A"), "string");
    await user.type(screen.getByPlaceholderText("Lựa chọn B"), "boolean");
    const correctAnswerA = screen.getByRole("radio", {
      name: "Đáp án đúng câu 1, phương án A",
    });
    const correctAnswerB = screen.getByRole("radio", {
      name: "Đáp án đúng câu 1, phương án B",
    });
    expect(correctAnswerA).toBeChecked();
    expect(screen.getByPlaceholderText("Lựa chọn A")).toHaveClass("border-emerald-300");
    await user.click(correctAnswerB);
    expect(correctAnswerB).toBeChecked();
    expect(correctAnswerA).not.toBeChecked();
    expect(screen.getByPlaceholderText("Lựa chọn B")).toHaveClass("border-emerald-300");
    await user.click(correctAnswerA);
    await user.click(screen.getByRole("button", { name: "Lưu và xuất bản" }));

    await waitFor(() => {
      expect(createLessonSpy).toHaveBeenCalledWith(
        mockStructure.courseId,
        "sec-1",
        expect.objectContaining({ type: "QUIZ", title: "Kiểm tra TypeScript", status: "DRAFT" }),
        "mock-token",
      );
      expect(updateLessonSpy).toHaveBeenCalledWith(
        mockStructure.courseId,
        "sec-1",
        "les-quiz",
        expect.objectContaining({ status: "PUBLISHED" }),
        "mock-token",
      );
      expect(createQuizSpy).toHaveBeenCalledWith(
        "les-quiz",
        {
          passingScore: 70,
          questions: [
            {
              prompt: "Kiểu nào dùng cho chuỗi?",
              options: [
                { label: "string", correct: true },
                { label: "boolean", correct: false },
              ],
            },
          ],
        },
        "mock-token",
      );
    });
  });

  it("shows Vietnamese validation before creating a quiz with incomplete answers", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const createLessonSpy = vi.spyOn(structureClient, "createLesson");

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    const addLessonButtons = await screen.findAllByRole("button", { name: /thêm bài học/i });
    await user.click(addLessonButtons[0]);
    await user.type(screen.getByPlaceholderText("Nhập tên bài học"), "Kiểm tra TypeScript");
    await user.click(screen.getByRole("button", { name: "Quiz" }));
    await user.click(screen.getByRole("tab", { name: "Quiz" }));
    await user.type(screen.getByLabelText("Nội dung câu hỏi"), "Kiểu nào dùng cho chuỗi?");
    await user.type(screen.getByPlaceholderText("Lựa chọn A"), "string");
    await user.click(screen.getByRole("button", { name: "Lưu và xuất bản" }));

    expect(
      await screen.findByText(/Câu 1 cần có nội dung, từ 2 đến 6 phương án hợp lệ/),
    ).toBeInTheDocument();
    expect(createLessonSpy).not.toHaveBeenCalled();
  });

  it("retries saving quiz questions without creating a duplicate lesson", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const createLessonSpy = vi.spyOn(structureClient, "createLesson").mockResolvedValue({
      id: "les-quiz-retry",
      sectionId: "sec-1",
      title: "Kiểm tra TypeScript",
      description: null,
      type: "QUIZ",
      textContent: null,
      videoDurationSeconds: 600,
      isPreview: false,
      status: "PUBLISHED",
      position: 2,
      createdAt: "2026-09-23T00:00:00Z",
      updatedAt: "2026-09-23T00:00:00Z",
    });
    vi.spyOn(structureClient, "updateLesson").mockResolvedValue({
      ...mockStructure.sections[0].lessons[0],
      id: "les-quiz-retry",
      title: "Kiểm tra TypeScript",
      type: "QUIZ",
      status: "PUBLISHED",
      position: 2,
    });
    const createQuizSpy = vi
      .spyOn(quizClient, "createInstructorQuiz")
      .mockRejectedValueOnce(new Error("Máy chủ đang bận."))
      .mockResolvedValueOnce({
        id: "quiz-1",
        lessonId: "les-quiz-retry",
        passingScore: 70,
        questions: [],
      });

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    const addLessonButtons = await screen.findAllByRole("button", { name: /thêm bài học/i });
    await user.click(addLessonButtons[0]);
    await user.type(screen.getByPlaceholderText("Nhập tên bài học"), "Kiểm tra TypeScript");
    await user.click(screen.getByRole("button", { name: "Quiz" }));
    await user.click(screen.getByRole("tab", { name: "Quiz" }));
    await user.type(screen.getByLabelText("Nội dung câu hỏi"), "Kiểu nào dùng cho chuỗi?");
    await user.type(screen.getByPlaceholderText("Lựa chọn A"), "string");
    await user.type(screen.getByPlaceholderText("Lựa chọn B"), "boolean");
    await user.click(screen.getByRole("button", { name: "Lưu và xuất bản" }));

    expect(
      await screen.findByText(/Bài học đã được tạo, nhưng chưa lưu được câu hỏi/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lưu và xuất bản" }));

    await waitFor(() => {
      expect(createLessonSpy).toHaveBeenCalledTimes(1);
      expect(createQuizSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("requires an MP4 or WebM video before creating a video lesson", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const createLessonSpy = vi.spyOn(structureClient, "createLesson");

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);
    const addLessonButtons = await screen.findAllByRole("button", { name: /thêm bài học/i });
    await user.click(addLessonButtons[0]);
    await user.type(screen.getByPlaceholderText("Nhập tên bài học"), "Video bài 1");
    await user.click(screen.getByRole("button", { name: "Video" }));
    await user.click(screen.getByRole("button", { name: "Lưu và xuất bản" }));

    expect(
      await screen.findByText("Vui lòng chọn video MP4 hoặc WebM cho bài học."),
    ).toBeInTheDocument();
    expect(createLessonSpy).not.toHaveBeenCalled();
  });

  it("uploads the selected video after creating a lesson and retries without duplicating it", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const createLessonSpy = vi.spyOn(structureClient, "createLesson").mockResolvedValue({
      id: "les-video-upload",
      sectionId: "sec-1",
      title: "Video bài 1",
      description: null,
      type: "VIDEO",
      textContent: null,
      videoDurationSeconds: 600,
      isPreview: false,
      status: "PUBLISHED",
      position: 2,
      createdAt: "2026-09-23T00:00:00Z",
      updatedAt: "2026-09-23T00:00:00Z",
    });
    const updateLessonSpy = vi.spyOn(structureClient, "updateLesson").mockResolvedValue({
      ...mockStructure.sections[0].lessons[0],
      id: "les-video-upload",
      title: "Video bài 1",
      type: "VIDEO",
      status: "PUBLISHED",
      position: 2,
    });
    const uploadSpy = vi
      .spyOn(videoClient, "uploadLessonVideo")
      .mockRejectedValueOnce(new Error("Kho lưu trữ tạm thời không khả dụng."))
      .mockResolvedValueOnce();

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);
    const addLessonButtons = await screen.findAllByRole("button", { name: /thêm bài học/i });
    await user.click(addLessonButtons[0]);
    await user.type(screen.getByPlaceholderText("Nhập tên bài học"), "Video bài 1");
    await user.click(screen.getByRole("button", { name: "Video" }));
    await user.click(screen.getByRole("tab", { name: "Tài liệu" }));
    await user.upload(
      screen.getByLabelText("Video bài học"),
      new File(["sample video"], "bai-giang.mp4", { type: "video/mp4" }),
    );
    await user.click(screen.getByRole("button", { name: "Lưu và xuất bản" }));

    expect(
      await screen.findByText(/Bài học đã được tạo nhưng video chưa tải xong/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lưu và xuất bản" }));
    await waitFor(() => {
      expect(createLessonSpy).toHaveBeenCalledTimes(1);
      expect(uploadSpy).toHaveBeenCalledTimes(2);
      expect(updateLessonSpy).toHaveBeenCalledWith(
        mockStructure.courseId,
        "sec-1",
        "les-video-upload",
        expect.objectContaining({ status: "PUBLISHED" }),
        "mock-token",
      );
      expect(uploadSpy).toHaveBeenLastCalledWith(
        mockStructure.courseId,
        "sec-1",
        "les-video-upload",
        expect.any(File),
        "mock-token",
      );
    });
  });

  it("handles reordering sections", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const reorderSpy = vi.spyOn(structureClient, "reorderSections").mockResolvedValue([]);

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    await screen.findByText(mockStructure.courseTitle);

    // Click move down button on first section
    const moveDownButtons = screen.getAllByTitle("Di chuyển xuống");
    await user.click(moveDownButtons[0]);

    await waitFor(() => {
      expect(reorderSpy).toHaveBeenCalledWith(
        mockStructure.courseId,
        {
          items: [
            { id: "sec-2", position: 1 },
            { id: "sec-1", position: 2 },
          ],
        },
        "mock-token",
      );
    });
  });

  it("handles deleting a section with confirmation modal", async () => {
    const user = userEvent.setup();
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);
    const deleteSectionSpy = vi.spyOn(structureClient, "deleteSection").mockResolvedValue();

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    await screen.findByText(mockStructure.courseTitle);

    const deleteButtons = screen.getAllByTitle("Xóa chương học");
    await user.click(deleteButtons[0]);

    // Modal pops up
    expect(screen.getByText("Xóa chương học?")).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByRole("button", { name: /xác nhận xóa/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSectionSpy).toHaveBeenCalledWith(mockStructure.courseId, "sec-1", "mock-token");
    });
  });
});
