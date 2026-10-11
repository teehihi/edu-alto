package com.edualto.course.dto;

import java.time.Instant;

public record LessonResourceUploadUrlResponse(String uploadUrl, String objectKey, Instant expiresAt) {
}
