package com.edualto.auth.dto;

import java.io.Serializable;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record UserSessionDto(
        UUID userId,
        String email,
        String fullName,
        Set<String> roles,
        String deviceName,
        Instant loggedInAt,
        Instant expiresAt
) implements Serializable {
}
