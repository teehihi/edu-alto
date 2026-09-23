package com.edualto.course.dto;

import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import java.time.Instant;
import java.util.UUID;

public record LessonResponse(
        UUID id,
        UUID sectionId,
        String title,
        String slug,
        String description,
        String content,
        LessonType lessonType,
        int position,
        Integer durationSeconds,
        boolean isPreview,
        String mediaKey,
        LessonStatus status,
        Instant createdAt,
        Instant updatedAt
) {
}
