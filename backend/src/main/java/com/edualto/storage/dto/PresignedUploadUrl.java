package com.edualto.storage.dto;

import java.time.Instant;

public record PresignedUploadUrl(
        String uploadUrl,
        String objectKey,
        Instant expiresAt
) {
}
