package com.edualto.course.dto;

import java.time.Instant;
import java.util.UUID;

public record SectionResponse(
        UUID id,
        UUID courseId,
        String title,
        String description,
        int position,
        int lessonCount,
        int totalDurationSeconds,
        Instant createdAt,
        Instant updatedAt
) {
}
