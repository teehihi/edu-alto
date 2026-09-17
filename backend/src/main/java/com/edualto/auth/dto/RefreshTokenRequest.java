package com.edualto.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
        @NotBlank(message = "Vui lòng gửi refresh token")
        String refreshToken
) {
}
