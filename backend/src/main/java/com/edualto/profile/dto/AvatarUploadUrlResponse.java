package com.edualto.profile.dto;

import java.time.Instant;

public record AvatarUploadUrlResponse(
        String uploadUrl,
        String objectKey,
        Instant expiresAt
) {
}
