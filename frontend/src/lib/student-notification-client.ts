import { apiPageRequest, type PageResult } from "@/lib/api";

export type StudentNotificationType = "ANNOUNCEMENT" | "REVIEW_REPLY";

export type StudentNotification = {
  id: string;
  type: StudentNotificationType;
  instructorName: string;
  instructorAvatarUrl: string | null;
  title: string;
  description: string;
  linkUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export function fetchStudentNotifications(accessToken: string, page = 0, size = 50) {
  return apiPageRequest<StudentNotification>(`/me/notifications?page=${page}&size=${size}`, {
    accessToken,
  });
}

export type StudentNotificationPage = PageResult<StudentNotification>;
