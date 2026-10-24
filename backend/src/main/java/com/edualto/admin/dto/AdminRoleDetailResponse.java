package com.edualto.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminRoleDetailResponse(
        UUID id,
        String name,
        String description,
        long userCount,
        List<AdminPermissionDto> permissions,
        Instant createdAt,
        Instant updatedAt
) {
}
