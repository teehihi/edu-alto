import { apiPageRequest, apiRequest } from "@/lib/api";

export type InstructorCourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type InstructorCourse = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  price: number;
  originalPrice: number | null;
  level: InstructorCourseLevel;
  language: string;
  status: InstructorCourseStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type InstructorCourseLevel = "ALL_LEVELS" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type InstructorCoursePayload = {
  title: string;
  slug?: string | null;
  tagline?: string | null;
  description: string;
  price: number;
  originalPrice?: number | null;
  level: InstructorCourseLevel;
  language: string;
  thumbnailKey?: string | null;
};

export type InstructorCoursePage = {
  data: InstructorCourse[];
  meta: { page: number; size: number; totalElements: number; totalPages: number };
};

export async function fetchInstructorCourses(
  accessToken?: string | null,
): Promise<InstructorCoursePage> {
  return apiPageRequest<InstructorCourse>("/instructor/courses?page=0&size=100", {
    accessToken,
  });
}

export function fetchInstructorCourse(
  courseId: string,
  accessToken?: string | null,
): Promise<InstructorCourse> {
  return apiRequest<InstructorCourse>(`/instructor/courses/${encodeURIComponent(courseId)}`, {
    accessToken,
  });
}

export type CourseThumbnailUploadUrl = {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
};

export function createCourseThumbnailUploadUrl(
  file: Pick<File, "type" | "size">,
  accessToken: string,
): Promise<CourseThumbnailUploadUrl> {
  return apiRequest<CourseThumbnailUploadUrl>("/instructor/courses/thumbnail-upload-url", {
    method: "POST",
    body: { contentType: file.type, contentLength: file.size },
    accessToken,
  });
}

export async function uploadCourseThumbnail(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) {
    throw new Error("Không thể tải ảnh khóa học lên. Vui lòng thử lại.");
  }
}

export function createInstructorCourse(
  payload: InstructorCoursePayload,
  accessToken?: string | null,
): Promise<InstructorCourse> {
  return apiRequest<InstructorCourse>("/instructor/courses", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export function updateInstructorCourse(
  courseId: string,
  payload: InstructorCoursePayload,
  accessToken?: string | null,
): Promise<InstructorCourse> {
  return apiRequest<InstructorCourse>(`/instructor/courses/${encodeURIComponent(courseId)}`, {
    method: "PUT",
    body: payload,
    accessToken,
  });
}

export function archiveInstructorCourse(
  courseId: string,
  accessToken?: string | null,
): Promise<InstructorCourse> {
  return apiRequest<InstructorCourse>(
    `/instructor/courses/${encodeURIComponent(courseId)}/archive`,
    { method: "POST", accessToken },
  );
}

export function publishInstructorCourse(
  courseId: string,
  accessToken?: string | null,
): Promise<InstructorCourse> {
  return apiRequest<InstructorCourse>(
    `/instructor/courses/${encodeURIComponent(courseId)}/publish`,
    { method: "POST", accessToken },
  );
}

export function deleteDraftInstructorCourse(
  courseId: string,
  accessToken?: string | null,
): Promise<void> {
  return apiRequest<void>(`/instructor/courses/${encodeURIComponent(courseId)}`, {
    method: "DELETE",
    accessToken,
  });
}
