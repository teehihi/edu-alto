package com.edualto.enrollment.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.enrollment.dto.EnrollmentResponse;
import com.edualto.enrollment.service.EnrollmentService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EnrollmentController {
    private final EnrollmentService service;

    public EnrollmentController(EnrollmentService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/courses/{courseId}/enrollments")
    @Operation(summary = "Ghi danh khóa học miễn phí; gọi lại trả cùng mã ghi danh")
    public ApiResponse<UUID> enroll(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID courseId) {
        return ApiResponse.ok(service.enroll(principal.id(), courseId));
    }

    @GetMapping("/api/v1/me/enrollments")
    @Operation(summary = "Xem các khóa học đã ghi danh của bạn")
    public ApiResponse<List<EnrollmentResponse>> history(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "enrolledAt,desc") String sort) {
        Page<EnrollmentResponse> result = service.getHistory(principal.id(), page, size, sort);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages()));
    }
}
