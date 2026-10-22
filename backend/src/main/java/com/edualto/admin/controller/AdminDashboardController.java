package com.edualto.admin.controller;

import com.edualto.admin.dto.AdminAnalyticsResponse;
import com.edualto.admin.dto.AdminDashboardSummaryResponse;
import com.edualto.admin.dto.AdminUserResponse;
import com.edualto.admin.service.AdminDashboardService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin", description = "Quản trị hệ thống và thống kê tổng hợp")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping("/dashboard/summary")
    @Operation(summary = "Quản trị viên xem số liệu tổng quan hệ thống")
    public ApiResponse<AdminDashboardSummaryResponse> getDashboardSummary(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(adminDashboardService.getDashboardSummary(principal.id()));
    }

    @GetMapping("/users")
    @Operation(summary = "Quản trị viên xem danh sách thành viên toàn hệ thống")
    public ApiResponse<List<AdminUserResponse>> listUsers(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role
    ) {
        Page<AdminUserResponse> result = adminDashboardService.listUsers(principal.id(), page, size, keyword, role);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }

    @GetMapping("/analytics")
    @Operation(summary = "Quản trị viên xem báo cáo và chỉ số học tập chuyên sâu")
    public ApiResponse<AdminAnalyticsResponse> getAnalytics(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(adminDashboardService.getAnalytics(principal.id()));
    }

    @PatchMapping("/users/{userId}/status")
    @Operation(summary = "Quản trị viên cập nhật trạng thái hoạt động thành viên")
    public ApiResponse<Void> updateUserStatus(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body
    ) {
        String status = body.getOrDefault("status", "ACTIVE");
        adminDashboardService.updateUserStatus(principal.id(), userId, status);
        return ApiResponse.ok();
    }
}
