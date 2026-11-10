package com.edualto.learning.dto;

import com.edualto.learning.domain.LearningActivityType;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record RecordLearningActivityRequest(
        @NotNull(message = "Mã khóa học không được để trống")
        UUID courseId,
        UUID sectionId,
        UUID lessonId,
        @NotNull(message = "Loại hoạt động không được để trống")
        LearningActivityType activityType,
        Instant occurredAt,
        String metadata
) {
}
