package com.edualto.learning.dto;

import java.time.Instant;
import java.util.UUID;

public record SavedLessonResourceResponse(
        UUID id,
        UUID attachmentId,
        UUID lessonId,
        UUID courseId,
        String courseSlug,
        String courseTitle,
        String sectionTitle,
        String lessonTitle,
        String fileName,
        String contentType,
        long contentLength,
        Instant savedAt
) {
}
