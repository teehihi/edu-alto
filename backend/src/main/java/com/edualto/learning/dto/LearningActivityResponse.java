package com.edualto.learning.dto;

import com.edualto.learning.domain.LearningActivityType;
import java.time.Instant;
import java.util.UUID;

public record LearningActivityResponse(
        UUID id,
        UUID studentId,
        UUID courseId,
        String courseTitle,
        UUID sectionId,
        UUID lessonId,
        String lessonTitle,
        LearningActivityType activityType,
        String activityDisplayName,
        String activityCategory,
        Instant occurredAt,
        String metadata
) {
}
