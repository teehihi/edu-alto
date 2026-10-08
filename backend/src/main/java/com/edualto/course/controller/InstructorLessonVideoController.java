package com.edualto.course.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.course.dto.LessonVideoUploadCompleteRequest;
import com.edualto.course.dto.LessonVideoUploadUrlRequest;
import com.edualto.course.dto.LessonVideoUploadUrlResponse;
import com.edualto.course.service.LessonVideoService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor/courses/{courseId}/sections/{sectionId}/lessons/{lessonId}")
public class InstructorLessonVideoController {
    private final LessonVideoService videos;

    public InstructorLessonVideoController(LessonVideoService videos) {
        this.videos = videos;
    }

    @PostMapping("/video-upload-url")
    @Operation(summary = "Tạo URL tải video bài học lên Cloudflare R2")
    public ApiResponse<LessonVideoUploadUrlResponse> uploadUrl(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @PathVariable UUID lessonId,
            @Valid @RequestBody LessonVideoUploadUrlRequest request
    ) {
        return ApiResponse.ok(videos.createUploadUrl(principal.id(), courseId, sectionId, lessonId, request));
    }

    @PostMapping(value = "/video-upload", consumes = {"video/mp4", "video/webm"})
    @Operation(summary = "Tải video qua máy chủ khi trình duyệt không truy cập được Cloudflare R2")
    public ApiResponse<Void> uploadThroughBackend(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @PathVariable UUID lessonId,
            @RequestParam("objectKey") String objectKey,
            HttpServletRequest request
    ) throws IOException {
        videos.uploadThroughBackend(
                principal.id(),
                courseId,
                sectionId,
                lessonId,
                objectKey,
                request.getContentType(),
                request.getContentLengthLong(),
                request.getInputStream()
        );
        return ApiResponse.ok();
    }

    @PostMapping("/video-upload-complete")
    @Operation(summary = "Xác nhận video đã tải lên kho lưu trữ")
    public ApiResponse<Void> completeUpload(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @PathVariable UUID lessonId,
            @Valid @RequestBody LessonVideoUploadCompleteRequest request
    ) {
        videos.completeUpload(principal.id(), courseId, sectionId, lessonId, request);
        return ApiResponse.ok();
    }
}
