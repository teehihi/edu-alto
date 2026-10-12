package com.edualto.course.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.course.dto.LessonAttachmentResponse;
import com.edualto.course.dto.LessonResourceUploadCompleteRequest;
import com.edualto.course.dto.LessonResourceUploadUrlRequest;
import com.edualto.course.dto.LessonResourceUploadUrlResponse;
import com.edualto.course.dto.UpdateLessonResourceVisibilityRequest;
import com.edualto.course.service.LessonResourceService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor/courses/{courseId}/sections/{sectionId}/lessons/{lessonId}/resources")
public class InstructorLessonResourceController {
    private final LessonResourceService resources;

    public InstructorLessonResourceController(LessonResourceService resources) {
        this.resources = resources;
    }

    @PostMapping("/upload-url")
    @Operation(summary = "Tạo URL tải tài liệu bài học lên Cloudflare R2")
    public ApiResponse<LessonResourceUploadUrlResponse> uploadUrl(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId, @PathVariable UUID sectionId, @PathVariable UUID lessonId,
            @Valid @RequestBody LessonResourceUploadUrlRequest request) {
        return ApiResponse.ok(resources.createUploadUrl(principal.id(), courseId, sectionId, lessonId, request));
    }

    @PostMapping(value = "/upload", consumes = "application/octet-stream")
    @Operation(summary = "Tải tài liệu qua máy chủ khi trình duyệt không truy cập được Cloudflare R2")
    public ApiResponse<Void> uploadThroughBackend(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId, @PathVariable UUID sectionId, @PathVariable UUID lessonId,
            @RequestParam("objectKey") String objectKey, @RequestParam("fileName") String fileName,
            @RequestParam("contentType") String contentType,
            HttpServletRequest request) throws IOException {
        resources.uploadThroughBackend(principal.id(), courseId, sectionId, lessonId, objectKey, fileName,
                contentType, request.getContentLengthLong(), request.getInputStream());
        return ApiResponse.ok();
    }

    @PostMapping("/upload-complete")
    @Operation(summary = "Xác nhận tài liệu bài học đã tải lên kho lưu trữ")
    public ApiResponse<LessonAttachmentResponse> completeUpload(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId, @PathVariable UUID sectionId, @PathVariable UUID lessonId,
            @Valid @RequestBody LessonResourceUploadCompleteRequest request) {
        return ApiResponse.ok(resources.completeUpload(principal.id(), courseId, sectionId, lessonId, request));
    }

    @PatchMapping("/{attachmentId}")
    @Operation(summary = "Cập nhật quyền hiển thị tài liệu với học viên")
    public ApiResponse<LessonAttachmentResponse> updateVisibility(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId, @PathVariable UUID sectionId, @PathVariable UUID lessonId,
            @PathVariable UUID attachmentId, @Valid @RequestBody UpdateLessonResourceVisibilityRequest request) {
        return ApiResponse.ok(resources.updateVisibility(principal.id(), courseId, sectionId, lessonId,
                attachmentId, request));
    }

    @DeleteMapping("/{attachmentId}")
    @Operation(summary = "Xóa tài liệu đính kèm của bài học")
    public ApiResponse<Void> deleteAttachment(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId, @PathVariable UUID sectionId, @PathVariable UUID lessonId,
            @PathVariable UUID attachmentId) {
        resources.deleteAttachment(principal.id(), courseId, sectionId, lessonId, attachmentId);
        return ApiResponse.ok();
    }
}
