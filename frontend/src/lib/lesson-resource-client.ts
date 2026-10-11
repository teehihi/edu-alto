import { apiRequest } from "@/lib/api";
import type { LessonAttachment } from "@/types/lesson-attachment";

type LessonResourceUploadUrl = {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
};

const resourceContentTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function getLessonResourceContentType(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const expectedType = resourceContentTypes[extension];
  if (!expectedType || (file.type && file.type !== expectedType)) return null;
  return expectedType;
}

export async function uploadLessonResource(
  courseId: string,
  sectionId: string,
  lessonId: string,
  file: File,
  accessToken?: string | null,
): Promise<LessonAttachment> {
  const contentType = getLessonResourceContentType(file);
  if (!contentType) throw new Error("Định dạng tài liệu chưa được hỗ trợ.");
  const basePath = `/instructor/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}/resources`;
  const { uploadUrl, objectKey } = await apiRequest<LessonResourceUploadUrl>(
    `${basePath}/upload-url`,
    {
      method: "POST",
      body: { fileName: file.name, contentType, contentLength: file.size },
      accessToken,
    },
  );

  let directUploadSucceeded = false;
  try {
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType, "Cache-Control": "private, no-store" },
      body: file,
    });
    directUploadSucceeded = uploadResponse.ok;
  } catch {
    // Fall back to the authenticated API if the browser cannot reach the storage endpoint.
  }

  if (!directUploadSucceeded) {
    const query = new URLSearchParams({ objectKey, fileName: file.name, contentType });
    await apiRequest<void>(`${basePath}/upload?${query.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: file,
      accessToken,
    });
  }

  return apiRequest<LessonAttachment>(`${basePath}/upload-complete`, {
    method: "POST",
    body: { objectKey, fileName: file.name },
    accessToken,
  });
}

export async function deleteLessonResource(
  courseId: string,
  sectionId: string,
  lessonId: string,
  attachmentId: string,
  accessToken?: string | null,
) {
  const basePath = `/instructor/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}/resources`;
  return apiRequest<void>(`${basePath}/${encodeURIComponent(attachmentId)}`, {
    method: "DELETE",
    accessToken,
  });
}
