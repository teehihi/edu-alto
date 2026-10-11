package com.edualto.course.dto;

import java.time.Instant;
import java.util.UUID;

public record LessonResourceDownloadResponse(UUID attachmentId, String downloadUrl, Instant expiresAt) {
}
