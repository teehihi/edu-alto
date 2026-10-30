import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentAnnouncementBell } from "./student-announcement-bell";
import * as authSession from "@/lib/auth-session";
import * as realtimeNotificationHook from "./use-realtime-notifications";
import * as studentNotificationHook from "./use-student-notifications";

vi.mock("@/lib/auth-session");
vi.mock("./use-realtime-notifications");
vi.mock("./use-student-notifications");

describe("StudentAnnouncementBell", () => {
  const mockMarkRealtimeRead = vi.fn();
  const mockMarkAllRealtimeRead = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authSession.useAuthSession).mockReturnValue({
      user: {
        id: "user-123",
        email: "student@example.com",
        fullName: "Học viên Test",
        roles: ["STUDENT"],
      },
      isAuthenticated: true,
      getAccessToken: vi.fn().mockResolvedValue("test-token"),
    } as unknown as ReturnType<typeof authSession.useAuthSession>);

    vi.mocked(studentNotificationHook.useStudentNotifications).mockReturnValue({
      items: [],
      loaded: true,
      error: "",
    });

    vi.mocked(realtimeNotificationHook.useRealtimeNotifications).mockReturnValue({
      items: [
        {
          id: "notif-1",
          recipientId: "user-123",
          type: "DISCUSSION_REPLY",
          title: "Giảng viên đã giải đáp câu hỏi của bạn",
          message: "Thầy Hưng vừa trả lời câu hỏi: Vòng lặp for",
          linkUrl: "/learning/lessons/lesson-1?courseId=course-1",
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
      loaded: true,
      isConnected: true,
      error: null,
      refresh: vi.fn(),
      markRead: mockMarkRealtimeRead,
      markAllRead: mockMarkAllRealtimeRead,
    });
  });

  it("renders the notification bell with unread badge", () => {
    render(<StudentAnnouncementBell />);
    const bellButton = screen.getByRole("button", { name: /Thông báo/i });
    expect(bellButton).toBeInTheDocument();
    expect(screen.getByLabelText("Thông báo, 1 chưa xem")).toBeInTheDocument();
  });

  it("opens popover dialog on click and displays real-time push notification", async () => {
    const user = userEvent.setup();
    render(<StudentAnnouncementBell />);

    const bellButton = screen.getByRole("button", { name: /Thông báo/i });
    await user.click(bellButton);

    expect(screen.getByRole("dialog", { name: /Thông báo/i })).toBeInTheDocument();
    expect(screen.getByText("Trực tiếp")).toBeInTheDocument();
    expect(screen.getByText("Giảng viên đã giải đáp câu hỏi của bạn")).toBeInTheDocument();
    expect(screen.getByText("Thầy Hưng vừa trả lời câu hỏi: Vòng lặp for")).toBeInTheDocument();
  });

  it("calls markAllRealtimeRead when user selects mark all as read", async () => {
    const user = userEvent.setup();
    render(<StudentAnnouncementBell />);

    const bellButton = screen.getByRole("button", { name: /Thông báo/i });
    await user.click(bellButton);

    const optionsButton = screen.getByRole("button", {
      name: /Tùy chọn thông báo/i,
    });
    await user.click(optionsButton);

    const markAllButton = screen.getByRole("button", {
      name: /Đánh dấu tất cả đã đọc/i,
    });
    await user.click(markAllButton);

    expect(mockMarkAllRealtimeRead).toHaveBeenCalled();
  });
});
