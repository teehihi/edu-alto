package com.edualto.commerce.controller;

import com.edualto.commerce.dto.InstructorRevenueSummaryResponse;
import com.edualto.commerce.dto.InstructorCourseRevenueResponse;
import com.edualto.commerce.dto.InstructorRevenueTransactionResponse;
import com.edualto.commerce.service.InstructorRevenueService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor/revenue")
@Tag(name = "Instructor Revenue", description = "Thống kê giao dịch khóa học của giảng viên")
public class InstructorRevenueController {
    private final InstructorRevenueService revenue;

    public InstructorRevenueController(InstructorRevenueService revenue) {
        this.revenue = revenue;
    }

    @GetMapping("/summary")
    @Operation(summary = "Tổng hợp doanh thu khóa học của giảng viên")
    public ApiResponse<InstructorRevenueSummaryResponse> summary(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.ok(revenue.getSummary(principal.id(), from, to));
    }

    @GetMapping("/courses/{courseId}/summary")
    @Operation(summary = "Tổng hợp doanh thu của một khóa học do giảng viên sở hữu")
    public ApiResponse<InstructorCourseRevenueResponse> courseSummary(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId
    ) {
        return ApiResponse.ok(revenue.getCourseSummary(principal.id(), courseId));
    }

    @GetMapping("/transactions")
    @Operation(summary = "Danh sách giao dịch theo khóa học của giảng viên")
    public ApiResponse<List<InstructorRevenueTransactionResponse>> transactions(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        Page<InstructorRevenueTransactionResponse> result = revenue.listTransactions(
                principal.id(), page, size, search, status, from, to
        );
        PageMeta meta = new PageMeta(result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
        return ApiResponse.page(result.getContent(), meta);
    }
}
