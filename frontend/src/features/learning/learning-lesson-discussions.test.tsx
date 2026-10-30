import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LearningLessonDiscussions } from "./learning-lesson-discussions";
import * as discussionClient from "@/lib/discussion-client";

const mockGetAccessToken = vi.fn().mockResolvedValue("test-token");
const mockSeekVideo = vi.fn();

const mockDiscussions: discussionClient.DiscussionItem[] = [
  {
    id: "disc-1",
    courseId: "course-1",
    lessonId: "lesson-1",
    authorId: "user-1",
    authorName: "Nguyễn Văn A",
    authorAvatarUrl: null,
    authorRole: "STUDENT",
    isCourseInstructor: false,
    title: "Thắc mắc tại sao vòng lặp dừng lại ở đây?",
    body: "Em xem đến đoạn này nhưng chưa hiểu điều kiện dừng.",
    videoTimestampSeconds: 125, // 02:05
    status: "OPEN",
    commentCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canDelete: true,
  },
  {
    id: "disc-2",
    courseId: "course-1",
    lessonId: "lesson-1",
    authorId: "user-2",
    authorName: "Trần Thị B",
    authorAvatarUrl: null,
    authorRole: "STUDENT",
    isCourseInstructor: false,
    title: "Tài liệu tham khảo thêm",
    body: "Có link github mẫu không ạ?",
    videoTimestampSeconds: null,
    status: "RESOLVED",
    commentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canDelete: false,
  },
];

const mockDetail: discussionClient.DiscussionDetail = {
  ...mockDiscussions[0],
  comments: [
    {
      id: "comment-1",
      discussionId: "disc-1",
      authorId: "instructor-1",
      authorName: "Thầy Hưng",
      authorAvatarUrl: null,
      authorRole: "INSTRUCTOR",
      isCourseInstructor: true,
      body: "Vì biến i tăng lên 10 nên điều kiện i < 10 không còn thỏa mãn em nhé.",
      parentCommentId: null,
      createdAt: new Date().toISOString(),
      canDelete: false,
    },
  ],
};

describe("LearningLessonDiscussions Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetAccessToken.mockResolvedValue("test-token");
    vi.spyOn(discussionClient, "fetchLessonDiscussions").mockResolvedValue({
      data: mockDiscussions,
      meta: { page: 0, size: 20, totalElements: 2, totalPages: 1 },
    });
    vi.spyOn(discussionClient, "fetchDiscussionDetail").mockResolvedValue(mockDetail);
  });

  it("renders the discussion list with video timestamp badge and resolved status", async () => {
    render(
      <LearningLessonDiscussions
        lessonId="lesson-1"
        isVideoLesson={true}
        currentVideoTime={125}
        getAccessToken={mockGetAccessToken}
        onSeekVideo={mockSeekVideo}
      />,
    );

    expect(
      await screen.findByText("Thắc mắc tại sao vòng lặp dừng lại ở đây?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Tài liệu tham khảo thêm")).toBeInTheDocument();
    expect(screen.getByText("02:05")).toBeInTheDocument();
    expect(screen.getByText("Đã giải đáp")).toBeInTheDocument();
  });

  it("triggers onSeekVideo when clicking timestamp pill", async () => {
    render(
      <LearningLessonDiscussions
        lessonId="lesson-1"
        isVideoLesson={true}
        currentVideoTime={0}
        getAccessToken={mockGetAccessToken}
        onSeekVideo={mockSeekVideo}
      />,
    );

    const timestampBtn = await screen.findByRole("button", { name: /02:05/i });
    await userEvent.click(timestampBtn);

    expect(mockSeekVideo).toHaveBeenCalledWith(125);
  });

  it("expands a discussion thread and displays instructor reply badge", async () => {
    render(
      <LearningLessonDiscussions
        lessonId="lesson-1"
        isVideoLesson={true}
        currentVideoTime={0}
        getAccessToken={mockGetAccessToken}
        onSeekVideo={mockSeekVideo}
      />,
    );

    const expandBtn = await screen.findByRole("button", { name: /1 câu trả lời/i });
    await userEvent.click(expandBtn);

    expect(await screen.findByText("Thầy Hưng")).toBeInTheDocument();
    expect(screen.getByText("Giảng viên giải đáp")).toBeInTheDocument();
    expect(
      screen.getByText("Vì biến i tăng lên 10 nên điều kiện i < 10 không còn thỏa mãn em nhé."),
    ).toBeInTheDocument();
  });

  it("allows submitting a new discussion question with video timestamp attached", async () => {
    const createSpy = vi.spyOn(discussionClient, "createLessonDiscussion").mockResolvedValue({
      id: "disc-new",
      courseId: "course-1",
      lessonId: "lesson-1",
      authorId: "student-1",
      authorName: "Học viên A",
      authorAvatarUrl: null,
      authorRole: "STUDENT",
      isCourseInstructor: false,
      title: "Hỏi về cách debug đoạn này",
      body: "Làm sao để đặt breakpoint ở đây ạ?",
      videoTimestampSeconds: 90,
      status: "OPEN",
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canDelete: true,
    });

    render(
      <LearningLessonDiscussions
        lessonId="lesson-1"
        isVideoLesson={true}
        currentVideoTime={90}
        getAccessToken={mockGetAccessToken}
        onSeekVideo={mockSeekVideo}
      />,
    );

    const openBtn = await screen.findByRole("button", { name: /Đặt câu hỏi mới/i });
    await userEvent.click(openBtn);

    const titleInput = screen.getByLabelText(/Tiêu đề câu hỏi/i);
    const bodyInput = screen.getByLabelText(/Chi tiết thắc mắc/i);

    await userEvent.type(titleInput, "Hỏi về cách debug đoạn này");
    await userEvent.type(bodyInput, "Làm sao để đặt breakpoint ở đây ạ?");

    const submitBtn = screen.getByRole("button", { name: /Gửi câu hỏi/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith("test-token", "lesson-1", {
        title: "Hỏi về cách debug đoạn này",
        body: "Làm sao để đặt breakpoint ở đây ạ?",
        videoTimestampSeconds: 90,
      });
    });

    expect(await screen.findByText("Hỏi về cách debug đoạn này")).toBeInTheDocument();
  });
});
