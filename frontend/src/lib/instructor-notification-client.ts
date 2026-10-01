import { apiPageRequest, apiRequest, type PageResult } from "@/lib/api";

export type InstructorNotificationStatus = "DRAFT" | "PUBLISHED";
export type InstructorNotificationAudience = "ALL_STUDENTS" | "ENROLLED_STUDENTS";

export type InstructorNotification = {
  id: string;
  title: string;
  description: string;
  linkUrl: string | null;
  audience: InstructorNotificationAudience;
  imageKey: string | null;
  imageUrl?: string | null;
  status: InstructorNotificationStatus;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InstructorNotificationPayload = {
  title: string;
  description: string;
  linkUrl: string | null;
  audience: InstructorNotificationAudience;
  imageKey: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type StudentInstructorAnnouncement = {
  id: string;
  instructorName: string;
  title: string;
  description: string;
  linkUrl: string | null;
  imageUrl: string | null;
  publishedAt: string;
};

export function fetchStudentInstructorAnnouncements(accessToken: string, page = 0, size = 20) {
  return apiPageRequest<StudentInstructorAnnouncement>(
    `/me/instructor-announcements?page=${page}&size=${size}`,
    { accessToken },
  );
}

export function fetchInstructorNotifications(
  accessToken: string,
  page = 0,
  size = 50,
): Promise<PageResult<InstructorNotification>> {
  return apiPageRequest<InstructorNotification>(
    `/instructor/notifications?page=${page}&size=${size}`,
    { accessToken },
  );
}

export async function fetchAllInstructorNotifications(accessToken: string) {
  const items: InstructorNotification[] = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const result = await fetchInstructorNotifications(accessToken, page, 100);
    items.push(...result.data);
    totalPages = result.meta.totalPages;
    page += 1;
  }
  return items.sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
}

export function createInstructorNotification(
  payload: InstructorNotificationPayload,
  accessToken: string,
): Promise<InstructorNotification> {
  return apiRequest<InstructorNotification>("/instructor/notifications", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function updateInstructorNotification(
  id: string,
  payload: InstructorNotificationPayload,
  accessToken: string,
): Promise<InstructorNotification> {
  return apiRequest<InstructorNotification>(`/instructor/notifications/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
    accessToken,
  });
}

export function publishInstructorNotification(id: string, accessToken: string) {
  return apiRequest<InstructorNotification>(
    `/instructor/notifications/${encodeURIComponent(id)}/publish`,
    { method: "POST", accessToken },
  );
}

export function deleteInstructorNotification(id: string, accessToken: string) {
  return apiRequest<void>(`/instructor/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
    accessToken,
  });
}
