import { apiPageRequest, apiRequest, type PageResult } from "@/lib/api";

export type InstructorConversation = {
  id: string;
  instructorId: string;
  instructorName: string;
  studentId: string;
  studentName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  blocked: boolean;
};

export type InstructorMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export function fetchInstructorConversations(
  accessToken: string,
  page = 0,
  size = 50,
): Promise<PageResult<InstructorConversation>> {
  return apiPageRequest<InstructorConversation>(
    `/instructor/conversations?page=${page}&size=${size}`,
    { accessToken },
  );
}

export function fetchInstructorMessages(
  conversationId: string,
  accessToken: string,
  page = 0,
  size = 100,
): Promise<PageResult<InstructorMessage>> {
  return apiPageRequest<InstructorMessage>(
    `/instructor/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&size=${size}`,
    { accessToken },
  );
}

export function sendInstructorMessage(
  conversationId: string,
  body: string,
  accessToken: string,
): Promise<InstructorMessage> {
  return apiRequest<InstructorMessage>(
    `/instructor/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: { body }, accessToken },
  );
}

export function setInstructorConversationBlocked(
  conversationId: string,
  blocked: boolean,
  accessToken: string,
): Promise<unknown> {
  return apiRequest(`/instructor/conversations/${encodeURIComponent(conversationId)}/block`, {
    method: "PUT",
    body: { blocked },
    accessToken,
  });
}

export function hideInstructorConversation(conversationId: string, accessToken: string) {
  return apiRequest<void>(`/instructor/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    accessToken,
  });
}
