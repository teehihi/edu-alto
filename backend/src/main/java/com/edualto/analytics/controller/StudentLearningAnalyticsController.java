package com.edualto.analytics.controller;

import com.edualto.analytics.dto.StudentCourseAnalyticsResponse;
import com.edualto.analytics.dto.StudentLearningAnalyticsOverviewResponse;
import com.edualto.analytics.service.StudentLearningAnalyticsService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/learning-analytics")
@Tag(name = "Student Learning Analytics", description = "Phân tích hiệu suất và thói quen học tập cá nhân của học viên (EDU-104 / EDU-106)")
public class StudentLearningAnalyticsController {

    private final StudentLearningAnalyticsService service;

    public StudentLearningAnalyticsController(StudentLearningAnalyticsService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Xem tổng quan phân tích hiệu suất, thói quen học tập và danh sách cần ôn tập")
    public ApiResponse<StudentLearningAnalyticsOverviewResponse> getOverview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "7") int days
    ) {
        return ApiResponse.ok(service.getOverview(principal.id(), days));
    }

    @GetMapping("/courses/{courseId}")
    @Operation(summary = "Xem chi tiết điểm số quiz, bài tập và tiến độ theo từng khóa học đã ghi danh")
    public ApiResponse<StudentCourseAnalyticsResponse> getCourseAnalytics(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId
    ) {
        return ApiResponse.ok(service.getCourseAnalytics(principal.id(), courseId));
    }
}
