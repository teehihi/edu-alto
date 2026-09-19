package com.edualto.user.dto;

import com.edualto.user.domain.User;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String fullName,
        String email,
        String status,
        List<String> roles,
        String avatarUrl,
        Instant emailVerifiedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(User user) {
        return from(user, null);
    }

    public static UserResponse from(User user, String avatarUrl) {
        List<String> roles = user.getRoles()
                .stream()
                .map(role -> role.getName().name())
                .sorted()
                .toList();

        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getStatus().name(),
                roles,
                avatarUrl,
                user.getEmailVerifiedAt(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
