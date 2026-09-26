import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InstructorCourseCurriculumPage } from "./instructor-course-curriculum-page";
import * as structureClient from "@/lib/course-structure-client";
import type { CourseStructure } from "@/types/course-structure";

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
    vi.spyOn(structureClient, "fetchCourseStructure").mockResolvedValue(mockStructure);

    render(<InstructorCourseCurriculumPage courseId={mockStructure.courseId} />);

    expect(await screen.findByText(mockStructure.courseTitle)).toBeInTheDocument();
    expect(screen.getByText("2 chương")).toBeInTheDocument();
    expect(screen.getByText("2 bài học")).toBeInTheDocument();
    expect(screen.getByText("20 phút")).toBeInTheDocument();

    expect(screen.getByText("Chương 1: Giới thiệu căn bản")).toBeInTheDocument();
    expect(screen.getByText("Chương 2: React Component Design")).toBeInTheDocument();
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

    expect(screen.getByText("Thêm chương học mới")).toBeInTheDocument();
    const titleInput = screen.getByPlaceholderText(/giới thiệu khóa học/i);
    await user.type(titleInput, "Chương 3: State Management");

    const submitBtn = screen.getByRole("button", { name: /tạo chương/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSectionSpy).toHaveBeenCalledWith(
        mockStructure.courseId,
        expect.objectContaining({ title: "Chương 3: State Management" }),
        "mock-token",
      );
    });
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
    const titleInput = screen.getByPlaceholderText(/giới thiệu cú pháp/i);
    await user.type(titleInput, "Bài mới: TypeScript Generics");

    const submitBtn = screen.getByRole("button", { name: /tạo bài học/i });
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
