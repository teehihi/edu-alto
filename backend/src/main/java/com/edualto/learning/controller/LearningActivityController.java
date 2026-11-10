package com.edualto.learning.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.learning.dto.LearningActivityResponse;
import com.edualto.learning.dto.LearningActivitySummaryResponse;
import com.edualto.learning.dto.LearningActivitySyncResponse;
import com.edualto.learning.dto.LearningActivityTypeInfoDto;
import com.edualto.learning.dto.RecordLearningActivityRequest;
import com.edualto.learning.service.LearningActivityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/learning/activities")
@Tag(name = "Learning Activities", description = "Quản lý dòng lịch sử hoạt động học tập và phân tích dữ liệu học viên (EDU-101 / EDU-97)")
public class LearningActivityController {

    private final LearningActivityService service;

    public LearningActivityController(LearningActivityService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Ghi nhận sự kiện hoạt động học tập của học viên")
    public ApiResponse<LearningActivityResponse> recordActivity(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody RecordLearningActivityRequest request
    ) {
        return ApiResponse.ok(service.recordActivity(principal.id(), request));
    }

    @GetMapping("/me")
    @Operation(summary = "Xem lịch sử dòng hoạt động học tập cá nhân")
    public ApiResponse<Page<LearningActivityResponse>> getMyActivities(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 20, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(service.getStudentActivities(principal.id(), courseId, from, to, pageable));
    }

    @GetMapping("/me/summary")
    @Operation(summary = "Xem tóm tắt thống kê hoạt động học tập cá nhân")
    public ApiResponse<LearningActivitySummaryResponse> getMySummary(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(service.getStudentSummary(principal.id()));
    }

    @GetMapping("/courses/{courseId}")
    @Operation(summary = "Xem dòng hoạt động học tập trong khóa học dành cho giảng viên phụ trách")
    public ApiResponse<Page<LearningActivityResponse>> getCourseActivities(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 20, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(service.getCourseActivitiesForInstructor(principal.id(), courseId, from, to, pageable));
    }

    @GetMapping("/types")
    @Operation(summary = "Lấy danh mục các loại sự kiện hoạt động học tập chuẩn hóa")
    public ApiResponse<List<LearningActivityTypeInfoDto>> getActivityTypes() {
        return ApiResponse.ok(service.getStandardizedActivityTypes());
    }

    @PostMapping("/sync")
    @Operation(summary = "Đồng bộ dữ liệu hoạt động học tập từ các module EduAlto (Admin)")
    public ApiResponse<LearningActivitySyncResponse> syncActivities() {
        return ApiResponse.ok(service.syncHistoricalActivities());
    }
}
