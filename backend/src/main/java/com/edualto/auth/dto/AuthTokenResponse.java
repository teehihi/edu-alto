package com.edualto.auth.dto;

import com.edualto.user.dto.UserResponse;

public record AuthTokenResponse(
        String tokenType,
        String accessToken,
        long expiresInSeconds,
        String refreshToken,
        UserResponse user
) {
}
