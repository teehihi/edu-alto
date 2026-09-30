import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SavedLessonsView } from "./saved-lessons-view";

const { fetchSavedLessonsMock, unsaveLearningLessonMock } = vi.hoisted(() => ({
  fetchSavedLessonsMock: vi.fn(),
  unsaveLearningLessonMock: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => ({ getAccessToken: vi.fn().mockResolvedValue("access-token") }),
}));

vi.mock("@/lib/learning-client", () => ({
  fetchSavedLessons: fetchSavedLessonsMock,
  unsaveLearningLesson: unsaveLearningLessonMock,
}));

const savedLesson = {
  id: "saved-1",
  lessonId: "lesson-1",
  courseId: "course-1",
  courseSlug: "course",
  courseTitle: "Khóa học mẫu",
  sectionTitle: "Chương 1",
  lessonTitle: "Bài học mẫu",
  lessonType: "TEXT",
  durationSeconds: 300,
  savedAt: "2026-09-30T10:00:00Z",
};

describe("SavedLessonsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSavedLessonsMock.mockImplementation(async (token: string, page: number) => ({
      data: [savedLesson],
      meta: { page, size: 20, totalElements: 21, totalPages: 2 },
    }));
  });

  it("loads later saved lessons through server pagination", async () => {
    const user = userEvent.setup();
    render(<SavedLessonsView />);

    expect(await screen.findByRole("link", { name: /Mở bài học/ })).toBeInTheDocument();
    expect(screen.getByText("Đã lưu 21 bài học")).toBeInTheDocument();
    expect(screen.getByText("Trang 1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sau" }));

    expect(await screen.findByText("Trang 2 / 2")).toBeInTheDocument();
    expect(fetchSavedLessonsMock).toHaveBeenLastCalledWith("access-token", 1);
  });

  it("moves back one page when removing the last item on a page", async () => {
    const user = userEvent.setup();
    render(<SavedLessonsView />);
    await screen.findByRole("link", { name: /Mở bài học/ });
    await user.click(screen.getByRole("button", { name: "Sau" }));
    await screen.findByText("Trang 2 / 2");
    fetchSavedLessonsMock.mockImplementation(async (_token: string, page: number) => ({
      data: [savedLesson],
      meta: { page, size: 20, totalElements: 20, totalPages: 1 },
    }));

    await user.click(screen.getByRole("button", { name: "Bỏ lưu Bài học mẫu" }));

    expect(unsaveLearningLessonMock).toHaveBeenCalledWith("access-token", "lesson-1");
    expect(await screen.findByText("Đã lưu 20 bài học")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sau" })).not.toBeInTheDocument();
    expect(fetchSavedLessonsMock).toHaveBeenLastCalledWith("access-token", 0);
  });
});
