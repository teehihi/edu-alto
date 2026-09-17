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
        Instant emailVerifiedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(User user) {
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
                user.getEmailVerifiedAt(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
