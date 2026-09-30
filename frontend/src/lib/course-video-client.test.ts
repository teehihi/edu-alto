import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api";
import { uploadLessonVideo } from "@/lib/course-video-client";

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }));

describe("uploadLessonVideo", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("uploads directly to the signed URL, then confirms the stored object", async () => {
    const file = new File(["video bytes"], "lesson.mp4", { type: "video/mp4" });
    const requestSpy = vi.mocked(apiRequest);
    requestSpy
      .mockResolvedValueOnce({
        uploadUrl: "https://storage.example/signed-upload",
        objectKey: "course-videos/course-1/lesson-1/video.mp4",
        expiresAt: "2026-09-30T00:15:00Z",
      })
      .mockResolvedValueOnce(undefined);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await uploadLessonVideo("course-1", "section-1", "lesson-1", file, "token");

    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      "/instructor/courses/course-1/sections/section-1/lessons/lesson-1/video-upload-url",
      {
        method: "POST",
        body: { contentType: "video/mp4", contentLength: file.size },
        accessToken: "token",
      },
    );
    expect(fetchSpy).toHaveBeenCalledWith("https://storage.example/signed-upload", {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "private, no-store",
      },
      body: file,
    });
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "/instructor/courses/course-1/sections/section-1/lessons/lesson-1/video-upload-complete",
      {
        method: "POST",
        body: { objectKey: "course-videos/course-1/lesson-1/video.mp4" },
        accessToken: "token",
      },
    );
  });

  it("does not confirm storage when the direct upload fails", async () => {
    const file = new File(["video bytes"], "lesson.webm", { type: "video/webm" });
    const requestSpy = vi.mocked(apiRequest);
    requestSpy.mockResolvedValueOnce({
      uploadUrl: "https://storage.example/signed-upload",
      objectKey: "course-videos/course-1/lesson-1/video.webm",
      expiresAt: "2026-09-30T00:15:00Z",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(uploadLessonVideo("course-1", "section-1", "lesson-1", file)).rejects.toThrow(
      "Không tải được video lên kho lưu trữ.",
    );
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });
});
