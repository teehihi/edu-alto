import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImgHTMLAttributes } from "react";
import { InstructorDashboardPage } from "./instructor-dashboard-page";
import * as courseClient from "@/lib/instructor-course-client";

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    void priority;
    // eslint-disable-next-line @next/next/no-img-element -- Render the optimized image as a test stub.
    return <img alt={alt} {...props} />;
  },
}));

vi.mock("@/features/auth/auth-client", () => ({
  useAuth: () => ({
    user: { id: "teacher-1", fullName: "Giảng viên A", avatarUrl: null },
    accessToken: "token",
    loading: false,
  }),
}));

const course: courseClient.InstructorCourse = {
  id: "course-1",
  title: "Lập trình Python căn bản",
  slug: "lap-trinh-python-can-ban",
  tagline: "Dành cho người mới bắt đầu",
  description: "Học Python từ những kiến thức nền tảng.",
  thumbnailKey: null,
  thumbnailUrl: null,
  price: 299000,
  originalPrice: 499000,
  level: "BEGINNER",
  language: "vi",
  status: "DRAFT",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  publishedAt: null,
};

describe("InstructorDashboardPage course management", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("creates a course through the active create action", async () => {
    const user = userEvent.setup();
    vi.spyOn(courseClient, "fetchInstructorCourses").mockResolvedValue({
      data: [],
      meta: { page: 0, size: 100, totalElements: 0, totalPages: 0 },
    });
    const createSpy = vi.spyOn(courseClient, "createInstructorCourse").mockResolvedValue(course);

    render(<InstructorDashboardPage />);
    await user.click(await screen.findByRole("button", { name: /thêm khóa học/i }));
    await user.type(screen.getByLabelText(/tên khóa học/i), course.title);
    await user.type(screen.getByLabelText(/mô tả khóa học/i), course.description ?? "");
    await user.click(screen.getByRole("button", { name: "Tạo bản nháp" }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: course.title,
          description: course.description,
          price: 0,
          level: "ALL_LEVELS",
        }),
        "token",
      );
    });
  });

  it("edits an existing course using its current values and saves the update", async () => {
    const user = userEvent.setup();
    vi.spyOn(courseClient, "fetchInstructorCourses").mockResolvedValue({
      data: [course],
      meta: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
    });
    const updateSpy = vi.spyOn(courseClient, "updateInstructorCourse").mockResolvedValue(course);

    render(<InstructorDashboardPage />);
    await user.click(await screen.findByRole("button", { name: /chỉnh sửa/i }));
    const title = screen.getByLabelText(/tên khóa học/i);
    await user.clear(title);
    await user.type(title, "Python thực chiến");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        course.id,
        expect.objectContaining({ title: "Python thực chiến", slug: course.slug }),
        "token",
      );
    });
  });

  it("asks before archiving and only archives after confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(courseClient, "fetchInstructorCourses").mockResolvedValue({
      data: [{ ...course, status: "PUBLISHED" }],
      meta: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
    });
    const archiveSpy = vi.spyOn(courseClient, "archiveInstructorCourse").mockResolvedValue({
      ...course,
      status: "ARCHIVED",
    });

    render(<InstructorDashboardPage />);
    await user.click(await screen.findByRole("button", { name: /lưu trữ/i }));
    expect(archiveSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(course.title);
    await user.click(screen.getByRole("button", { name: "Lưu trữ khóa học" }));

    await waitFor(() => expect(archiveSpy).toHaveBeenCalledWith(course.id, "token"));
  });

  it("publishes a draft only after confirmation and refreshes course status", async () => {
    const user = userEvent.setup();
    vi.spyOn(courseClient, "fetchInstructorCourses").mockResolvedValue({
      data: [course],
      meta: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
    });
    const publishSpy = vi.spyOn(courseClient, "publishInstructorCourse").mockResolvedValue({
      ...course,
      status: "PUBLISHED",
    });

    render(<InstructorDashboardPage />);
    await user.click(await screen.findByRole("button", { name: "Xuất bản" }));
    expect(publishSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("hiển thị công khai");
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Xuất bản khóa học" }),
    );

    await waitFor(() => expect(publishSpy).toHaveBeenCalledWith(course.id, "token"));
  });

  it("shows a validation error instead of publishing a draft without a description", async () => {
    const user = userEvent.setup();
    vi.spyOn(courseClient, "fetchInstructorCourses").mockResolvedValue({
      data: [{ ...course, description: "" }],
      meta: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
    });
    const publishSpy = vi.spyOn(courseClient, "publishInstructorCourse");

    render(<InstructorDashboardPage />);
    await user.click(await screen.findByRole("button", { name: "Xuất bản" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Xuất bản khóa học" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Vui lòng bổ sung mô tả khóa học");
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("requires course name and description before sending a request", async () => {
    const user = userEvent.setup();
    vi.spyOn(courseClient, "fetchInstructorCourses").mockResolvedValue({
      data: [],
      meta: { page: 0, size: 100, totalElements: 0, totalPages: 0 },
    });
    const createSpy = vi.spyOn(courseClient, "createInstructorCourse");

    render(<InstructorDashboardPage />);
    await user.click(await screen.findByRole("button", { name: /thêm khóa học/i }));
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(createSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập tên và mô tả khóa học.");
  });

  it("deletes only a draft after confirmation and refreshes the list", async () => {
    const user = userEvent.setup();
    vi.spyOn(courseClient, "fetchInstructorCourses").mockResolvedValue({
      data: [course],
      meta: { page: 0, size: 100, totalElements: 1, totalPages: 1 },
    });
    const deleteSpy = vi.spyOn(courseClient, "deleteDraftInstructorCourse").mockResolvedValue();

    render(<InstructorDashboardPage />);
    await user.click(await screen.findByRole("button", { name: "Xóa bản nháp" }));
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent("không thể hoàn tác");
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Xóa bản nháp" }),
    );

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith(course.id, "token"));
  });
});
