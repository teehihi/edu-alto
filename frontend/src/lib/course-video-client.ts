import { apiRequest } from "@/lib/api";

type LessonVideoUploadUrl = {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
};

export async function uploadLessonVideo(
  courseId: string,
  sectionId: string,
  lessonId: string,
  file: File,
  accessToken?: string | null,
): Promise<void> {
  const basePath = `/instructor/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/lessons/${encodeURIComponent(lessonId)}`;
  const { uploadUrl, objectKey } = await apiRequest<LessonVideoUploadUrl>(
    `${basePath}/video-upload-url`,
    {
      method: "POST",
      body: { contentType: file.type, contentLength: file.size },
      accessToken,
    },
  );

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "private, no-store",
    },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error("Không tải được video lên kho lưu trữ. Vui lòng thử lại.");
  }

  await apiRequest<void>(`${basePath}/video-upload-complete`, {
    method: "POST",
    body: { objectKey },
    accessToken,
  });
}
