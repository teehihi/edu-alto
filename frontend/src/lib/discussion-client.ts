import { apiPageRequest, apiRequest } from "@/lib/api";

export type DiscussionItem = {
  id: string;
  courseId: string;
  lessonId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRole: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  isCourseInstructor: boolean;
  title: string;
  body: string;
  videoTimestampSeconds: number | null;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
};

export type DiscussionComment = {
  id: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorRole: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  isCourseInstructor: boolean;
  body: string;
  parentCommentId: string | null;
  createdAt: string;
  canDelete: boolean;
};

export type DiscussionDetail = DiscussionItem & {
  comments: DiscussionComment[];
};

export type CreateDiscussionPayload = {
  title: string;
  body: string;
  videoTimestampSeconds?: number | null;
};

export type CreateCommentPayload = {
  body: string;
  parentCommentId?: string | null;
};

export type FetchDiscussionsParams = {
  page?: number;
  size?: number;
  sort?: "latest" | "oldest" | "timestamp";
  search?: string;
  hasTimestamp?: boolean;
};

export async function fetchLessonDiscussions(
  accessToken: string,
  lessonId: string,
  params?: FetchDiscussionsParams,
) {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set("page", String(params.page));
  if (params?.size !== undefined) query.set("size", String(params.size));
  if (params?.sort) query.set("sort", params.sort);
  if (params?.search) query.set("search", params.search);
  if (params?.hasTimestamp !== undefined) query.set("hasTimestamp", String(params.hasTimestamp));

  const qs = query.toString();
  return apiPageRequest<DiscussionItem>(
    `/lessons/${encodeURIComponent(lessonId)}/discussions${qs ? `?${qs}` : ""}`,
    { accessToken },
  );
}

export async function fetchCourseDiscussions(
  accessToken: string,
  courseId: string,
  params?: { page?: number; size?: number },
) {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set("page", String(params.page));
  if (params?.size !== undefined) query.set("size", String(params.size));
  const qs = query.toString();
  return apiPageRequest<DiscussionItem>(
    `/courses/${encodeURIComponent(courseId)}/discussions${qs ? `?${qs}` : ""}`,
    { accessToken },
  );
}

export async function fetchDiscussionDetail(accessToken: string, discussionId: string) {
  return apiRequest<DiscussionDetail>(`/discussions/${encodeURIComponent(discussionId)}`, {
    accessToken,
  });
}

export async function createLessonDiscussion(
  accessToken: string,
  lessonId: string,
  payload: CreateDiscussionPayload,
) {
  return apiRequest<DiscussionItem>(`/lessons/${encodeURIComponent(lessonId)}/discussions`, {
    method: "POST",
    accessToken,
    body: payload,
  });
}

export async function addDiscussionComment(
  accessToken: string,
  discussionId: string,
  payload: CreateCommentPayload,
) {
  return apiRequest<DiscussionComment>(
    `/discussions/${encodeURIComponent(discussionId)}/comments`,
    {
      method: "POST",
      accessToken,
      body: payload,
    },
  );
}

export async function deleteDiscussion(accessToken: string, discussionId: string) {
  return apiRequest<void>(`/discussions/${encodeURIComponent(discussionId)}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function deleteDiscussionComment(
  accessToken: string,
  discussionId: string,
  commentId: string,
) {
  return apiRequest<void>(
    `/discussions/${encodeURIComponent(discussionId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      accessToken,
    },
  );
}

export async function updateDiscussionStatus(
  accessToken: string,
  discussionId: string,
  status: "OPEN" | "RESOLVED",
) {
  return apiRequest<DiscussionItem>(`/discussions/${encodeURIComponent(discussionId)}/status`, {
    method: "PUT",
    accessToken,
    body: { status },
  });
}
