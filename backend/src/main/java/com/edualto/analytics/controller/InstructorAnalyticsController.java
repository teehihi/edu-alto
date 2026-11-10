package com.edualto.analytics.controller;

import com.edualto.analytics.dto.InstructorAnalyticsOverviewResponse;
import com.edualto.analytics.service.InstructorAnalyticsService;
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
@RequestMapping("/api/v1/instructor/analytics")
@Tag(name = "Instructor Analytics", description = "Báo cáo phân tích số liệu học tập và doanh thu dành cho giảng viên")
public class InstructorAnalyticsController {

    private final InstructorAnalyticsService service;

    public InstructorAnalyticsController(InstructorAnalyticsService service) {
        this.service = service;
    }

    @GetMapping("/overview")
    @Operation(summary = "Lấy báo cáo phân tích tổng quan số liệu học tập và doanh thu")
    public ApiResponse<InstructorAnalyticsOverviewResponse> getOverview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) UUID courseId
    ) {
        return ApiResponse.ok(service.getOverview(principal.id(), courseId));
    }

    @GetMapping("/courses/{courseId}")
    @Operation(summary = "Lấy báo cáo phân tích số liệu học tập và doanh thu theo từng khóa học cụ thể")
    public ApiResponse<InstructorAnalyticsOverviewResponse> getCourseOverview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId
    ) {
        return ApiResponse.ok(service.getOverview(principal.id(), courseId));
    }
}
