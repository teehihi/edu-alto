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

  let directUploadSucceeded = false;
  try {
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Cache-Control": "private, no-store",
      },
      body: file,
    });
    directUploadSucceeded = uploadResponse.ok;
  } catch {
    // R2 CORS may block browser uploads. Retry through the authenticated API, which streams to R2.
  }

  if (!directUploadSucceeded) {
    await apiRequest<void>(`${basePath}/video-upload?objectKey=${encodeURIComponent(objectKey)}`, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
      accessToken,
    });
  }

  await apiRequest<void>(`${basePath}/video-upload-complete`, {
    method: "POST",
    body: { objectKey },
    accessToken,
  });
}
