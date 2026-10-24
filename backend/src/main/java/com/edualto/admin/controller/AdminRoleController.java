package com.edualto.admin.controller;

import com.edualto.admin.dto.AdminPermissionDto;
import com.edualto.admin.dto.AdminRoleDetailResponse;
import com.edualto.admin.dto.UpdateRolePermissionsRequest;
import com.edualto.admin.service.AdminRbacService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin RBAC", description = "Quản lý vai trò và danh mục phân quyền truy cập")
public class AdminRoleController {

    private final AdminRbacService adminRbacService;

    public AdminRoleController(AdminRbacService adminRbacService) {
        this.adminRbacService = adminRbacService;
    }

    @GetMapping("/roles")
    @Operation(summary = "Quản trị viên xem danh sách vai trò và phân quyền tương ứng")
    public ApiResponse<List<AdminRoleDetailResponse>> getRoles(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(adminRbacService.getRoles(principal.id()));
    }

    @GetMapping("/roles/{roleId}")
    @Operation(summary = "Quản trị viên xem chi tiết một vai trò cụ thể")
    public ApiResponse<AdminRoleDetailResponse> getRoleById(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID roleId
    ) {
        return ApiResponse.ok(adminRbacService.getRoleById(principal.id(), roleId));
    }

    @PutMapping("/roles/{roleId}/permissions")
    @Operation(summary = "Quản trị viên cập nhật danh sách quyền cho vai trò")
    public ApiResponse<AdminRoleDetailResponse> updateRolePermissions(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID roleId,
            @Valid @RequestBody UpdateRolePermissionsRequest request
    ) {
        return ApiResponse.ok(adminRbacService.updateRolePermissions(principal.id(), roleId, request));
    }

    @GetMapping("/permissions")
    @Operation(summary = "Quản trị viên xem danh mục toàn bộ quyền hạn theo module")
    public ApiResponse<List<AdminPermissionDto>> getAllPermissions(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(adminRbacService.getAllPermissions(principal.id()));
    }
}
