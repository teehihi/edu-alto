package com.edualto.course.dto;

import java.time.Instant;

public record CourseThumbnailUploadUrlResponse(
        String uploadUrl,
        String objectKey,
        Instant expiresAt
) {
}
