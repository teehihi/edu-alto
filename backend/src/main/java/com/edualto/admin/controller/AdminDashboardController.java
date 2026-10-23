package com.edualto.admin.controller;

import com.edualto.admin.dto.AdminAnalyticsResponse;
import com.edualto.admin.dto.AdminDashboardSummaryResponse;
import com.edualto.admin.dto.AdminUserResponse;
import com.edualto.admin.dto.CreateAdminUserRequest;
import com.edualto.admin.dto.ResetUserPasswordRequest;
import com.edualto.admin.dto.UpdateUserRolesRequest;
import com.edualto.admin.service.AdminDashboardService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
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
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false, defaultValue = "30days") String timeRange
    ) {
        return ApiResponse.ok(adminDashboardService.getDashboardSummary(principal.id(), timeRange));
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

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Quản trị viên tạo mới thành viên và gán vai trò ban đầu")
    public ApiResponse<AdminUserResponse> createUser(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateAdminUserRequest request
    ) {
        return ApiResponse.ok(adminDashboardService.createUser(principal.id(), request));
    }

    @PatchMapping("/users/{userId}/roles")
    @Operation(summary = "Quản trị viên phân quyền / cấp vai trò cho thành viên")
    public ApiResponse<Void> updateUserRoles(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRolesRequest request
    ) {
        adminDashboardService.updateUserRoles(principal.id(), userId, request.roles());
        return ApiResponse.ok();
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

    @PostMapping("/users/{userId}/reset-password")
    @Operation(summary = "Quản trị viên đặt lại mật khẩu cho thành viên")
    public ApiResponse<Void> resetUserPassword(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID userId,
            @Valid @RequestBody ResetUserPasswordRequest request
    ) {
        adminDashboardService.resetUserPassword(principal.id(), userId, request.newPassword());
        return ApiResponse.ok();
    }

    @GetMapping("/analytics")
    @Operation(summary = "Quản trị viên xem báo cáo và chỉ số học tập chuyên sâu")
    public ApiResponse<AdminAnalyticsResponse> getAnalytics(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(adminDashboardService.getAnalytics(principal.id()));
    }
}
