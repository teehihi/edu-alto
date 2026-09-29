package com.edualto.learning.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.course.dto.LearningLessonResponse;
import com.edualto.learning.dto.CourseProgressResponse;
import com.edualto.learning.service.LearningService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LearningController {
    private final LearningService service;

    public LearningController(LearningService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/lessons/{lessonId}")
    @Operation(summary = "Đọc bài học văn bản sau khi ghi danh")
    public ApiResponse<LearningLessonResponse> lesson(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID lessonId) {
        return ApiResponse.ok(service.getLesson(principal.id(), lessonId));
    }

    @PostMapping("/api/v1/lessons/{lessonId}/complete")
    @Operation(summary = "Xác nhận hoàn thành bài học văn bản; gọi lại không tạo tiến độ trùng")
    public ApiResponse<CourseProgressResponse> complete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID lessonId) {
        return ApiResponse.ok(service.complete(principal.id(), lessonId));
    }

    @GetMapping("/api/v1/me/courses/{courseId}/progress")
    @Operation(summary = "Xem tiến độ của bạn theo giáo trình đang xuất bản")
    public ApiResponse<CourseProgressResponse> progress(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID courseId) {
        return ApiResponse.ok(service.getProgress(principal.id(), courseId));
    }
}
