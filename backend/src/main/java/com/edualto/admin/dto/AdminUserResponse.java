package com.edualto.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminUserResponse(
        UUID id,
        String fullName,
        String email,
        String status,
        List<String> roles,
        Instant createdAt,
        long enrolledCoursesCount,
        long teachingCoursesCount,
        String avatarUrl
) {
}
