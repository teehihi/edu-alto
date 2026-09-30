package com.edualto.course.dto;

import java.time.Instant;

public record LessonVideoUploadUrlResponse(String uploadUrl, String objectKey, Instant expiresAt) {
}
