package com.edualto.learning.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.course.dto.LessonResourceDownloadResponse;
import com.edualto.course.service.LessonResourceService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LessonResourceController {
    private final LessonResourceService resources;

    public LessonResourceController(LessonResourceService resources) {
        this.resources = resources;
    }

    @GetMapping("/api/v1/lessons/{lessonId}/resources/{attachmentId}/download")
    @Operation(summary = "Tạo liên kết tải tài liệu bài học đã ghi danh")
    public ApiResponse<LessonResourceDownloadResponse> downloadUrl(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID lessonId, @PathVariable UUID attachmentId) {
        return ApiResponse.ok(resources.createDownloadUrl(principal.id(), lessonId, attachmentId));
    }
}
