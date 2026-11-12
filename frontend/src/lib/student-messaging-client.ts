import { apiPageRequest, apiRequest, type PageResult } from "@/lib/api";

export type StudentConversation = {
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

export type StudentMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type ConversationStartResult = {
  conversationId: string;
  message: StudentMessage;
};

export function fetchStudentConversations(
  accessToken: string,
  page = 0,
  size = 50,
): Promise<PageResult<StudentConversation>> {
  return apiPageRequest<StudentConversation>(`/me/conversations?page=${page}&size=${size}`, {
    accessToken,
  });
}

export function fetchStudentMessages(
  conversationId: string,
  accessToken: string,
  page = 0,
  size = 100,
): Promise<PageResult<StudentMessage>> {
  return apiPageRequest<StudentMessage>(
    `/me/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&size=${size}`,
    { accessToken },
  );
}

export function sendStudentMessage(
  conversationId: string,
  body: string,
  accessToken: string,
): Promise<StudentMessage> {
  return apiRequest<StudentMessage>(
    `/me/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: { body }, accessToken },
  );
}

export function startStudentConversation(
  instructorId: string,
  body: string,
  accessToken: string,
): Promise<ConversationStartResult> {
  return apiRequest<ConversationStartResult>(
    `/me/instructors/${encodeURIComponent(instructorId)}/conversations`,
    { method: "POST", body: { body }, accessToken },
  );
}
