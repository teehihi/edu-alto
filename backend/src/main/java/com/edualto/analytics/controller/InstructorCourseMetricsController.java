package com.edualto.analytics.controller;

import com.edualto.analytics.dto.InstructorCourseMetricsResponse;
import com.edualto.analytics.service.InstructorCourseMetricsService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor/analytics")
@Tag(name = "Instructor Analytics", description = "Số liệu tổng hợp dành cho giảng viên")
public class InstructorCourseMetricsController {

    private final InstructorCourseMetricsService service;

    public InstructorCourseMetricsController(InstructorCourseMetricsService service) {
        this.service = service;
    }

    @GetMapping("/course-metrics")
    @Operation(summary = "Lấy số liệu tổng hợp cho các khóa học của giảng viên hiện tại")
    public ApiResponse<List<InstructorCourseMetricsResponse>> getCourseMetrics(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(service.getInstructorCourseMetrics(principal.id()));
    }
}
