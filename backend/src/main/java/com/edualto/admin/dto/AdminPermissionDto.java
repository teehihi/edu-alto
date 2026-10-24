package com.edualto.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminPermissionDto(
        UUID id,
        String name,
        String apiPath,
        String method,
        String module,
        String description,
        Instant createdAt
) {
}
