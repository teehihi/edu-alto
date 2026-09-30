package com.edualto.learning.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.course.dto.LessonVideoAccessResponse;
import com.edualto.course.service.LessonVideoService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/lessons")
public class LessonVideoController {
    private final LessonVideoService videos;

    public LessonVideoController(LessonVideoService videos) {
        this.videos = videos;
    }

    @GetMapping("/{lessonId}/video-access")
    @Operation(summary = "Tạo liên kết xem video có thời hạn cho học viên đã ghi danh")
    public ApiResponse<LessonVideoAccessResponse> videoAccess(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID lessonId
    ) {
        return ApiResponse.ok(videos.createPlaybackUrl(principal.id(), lessonId));
    }
}
