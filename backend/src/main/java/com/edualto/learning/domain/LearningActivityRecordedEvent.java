package com.edualto.learning.domain;

import java.time.Instant;
import java.util.UUID;

public record LearningActivityRecordedEvent(
        UUID activityId,
        UUID studentId,
        UUID courseId,
        UUID sectionId,
        UUID lessonId,
        LearningActivityType activityType,
        UUID sourceId,
        Instant occurredAt,
        String metadata
) {
}
