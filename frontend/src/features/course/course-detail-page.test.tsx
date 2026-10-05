import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CourseDetailPage } from "./course-detail-page";
import { ApiClientError } from "@/lib/api";
import {
  fetchPublicCourseBySlug,
  fetchPublicCourses,
  fetchPublicCurriculum,
  fetchLessonPreview,
} from "@/lib/course-client";

const routerPushMock = vi.fn();

vi.mock("@/lib/course-client", () => ({
  fetchPublicCourseBySlug: vi.fn(),
  fetchPublicCourses: vi.fn(),
  fetchPublicCurriculum: vi.fn(),
  fetchLessonPreview: vi.fn(),
  getCachedCourseDetail: vi.fn(() => null),
  getCachedCurriculum: vi.fn(() => null),
  getCachedCoursePage: vi.fn(() => null),
}));
vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => null }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, refresh: vi.fn() }),
}));
vi.mock("@/lib/auth-session", () => ({
  useAuthSession: () => ({ user: null, getAccessToken: vi.fn() }),
}));
const course = {
  id: "course-1",
  slug: "khoa-hoc",
  title: "Lập trình web thực tế",
  tagline: "Xây dựng ứng dụng đầu tiên",
  description: "Nội dung khóa học thực tế.",
  thumbnailUrl: null,
  price: 0,
  originalPrice: null,
  level: "BEGINNER" as const,
  language: "vi",
  status: "PUBLISHED" as const,
  publishedAt: null,
  createdAt: "",
  updatedAt: "",
  instructor: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
  vi.mocked(fetchPublicCourses).mockResolvedValue([]);
  vi.mocked(fetchPublicCourseBySlug).mockResolvedValue(course);
  vi.mocked(fetchPublicCurriculum).mockResolvedValue({
    courseId: course.id,
    slug: course.slug,
    sections: [
      {
        id: "section-1",
        title: "Bắt đầu",
        lessons: [
          {
            id: "preview-1",
            title: "Giới thiệu",
            lessonType: "TEXT",
            durationSeconds: null,
            preview: true,
          },
          {
            id: "private-1",
            title: "Bài học riêng",
            lessonType: "TEXT",
            durationSeconds: null,
            preview: false,
          },
        ],
      },
    ],
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

it("adds a paid course to the cart when the add button is clicked", async () => {
  vi.mocked(fetchPublicCourseBySlug).mockResolvedValue({
    ...course,
    price: 299_000,
    originalPrice: 499_000,
  });
  const user = userEvent.setup();
  render(<CourseDetailPage slug="khoa-hoc" />);

  await user.click(await screen.findByRole("button", { name: "Thêm vào giỏ hàng" }));

  expect(JSON.parse(window.localStorage.getItem("edualto:cart:v1") ?? "[]")).toEqual([
    expect.objectContaining({ id: course.id, price: 299_000 }),
  ]);
  expect(screen.getByText("Đã thêm khóa học vào giỏ hàng.")).toBeInTheDocument();
});

it("adds a paid course and opens checkout when buy now is clicked", async () => {
  vi.mocked(fetchPublicCourseBySlug).mockResolvedValue({
    ...course,
    price: 299_000,
    originalPrice: 499_000,
  });
  const user = userEvent.setup();
  render(<CourseDetailPage slug="khoa-hoc" />);

  await user.click(await screen.findByRole("button", { name: "Mua ngay" }));

  expect(JSON.parse(window.localStorage.getItem("edualto:cart:v1") ?? "[]")).toEqual([
    expect.objectContaining({ id: course.id, price: 299_000 }),
  ]);
  expect(routerPushMock).toHaveBeenCalledWith("/checkout");
});

it("loads real course data and fetches preview only after an explicit action", async () => {
  vi.mocked(fetchLessonPreview).mockResolvedValue({
    id: "preview-1",
    title: "Giới thiệu",
    lessonType: "TEXT",
    textContent: "Nội dung học thử an toàn.",
  });
  const user = userEvent.setup();
  render(<CourseDetailPage slug="khoa-hoc" />);
  expect(await screen.findByRole("heading", { level: 1, name: course.title })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Đăng ký học" })).toBeEnabled();
  expect(fetchLessonPreview).not.toHaveBeenCalled();
  await user.click(screen.getByText("Bắt đầu"));
  await user.click(screen.getByRole("button", { name: "Học thử" }));
  expect(await screen.findByText("Nội dung học thử an toàn.")).toBeInTheDocument();
  expect(fetchLessonPreview).toHaveBeenCalledWith("khoa-hoc", "preview-1");
  await user.click(screen.getByRole("button", { name: "Đóng bài học thử" }));
  await waitFor(() =>
    expect(screen.queryByText("Nội dung học thử an toàn.")).not.toBeInTheDocument(),
  );
});

it("shows a missing course without substituting demo content", async () => {
  vi.mocked(fetchPublicCourseBySlug).mockRejectedValue(
    new ApiClientError(404, { code: "COURSE_NOT_FOUND", message: "Không tìm thấy", details: [] }),
  );
  render(<CourseDetailPage slug="khong-ton-tai" />);
  expect(
    await screen.findByRole("heading", { name: "Không tìm thấy khóa học" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(course.title)).not.toBeInTheDocument();
});

it("retries a transient course loading failure", async () => {
  vi.mocked(fetchPublicCourseBySlug)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(course);
  const user = userEvent.setup();
  render(<CourseDetailPage slug="khoa-hoc" />);
  await user.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(await screen.findByRole("heading", { level: 1, name: course.title })).toBeInTheDocument();
});

it("shows curriculum errors without inventing sections", async () => {
  vi.mocked(fetchPublicCurriculum).mockRejectedValue(new Error("offline"));
  render(<CourseDetailPage slug="khoa-hoc" />);
  expect(await screen.findByRole("button", { name: "Tải lại giáo trình" })).toBeInTheDocument();
  expect(screen.queryByText("Bắt đầu")).not.toBeInTheDocument();
});
