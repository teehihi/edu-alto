package com.edualto.admin.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record UpdateRolePermissionsRequest(
        String description,
        @NotNull(message = "Danh sách quyền không được để trống")
        List<UUID> permissionIds
) {
}
