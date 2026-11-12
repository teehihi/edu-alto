package com.edualto.analytics.dto;

import java.time.Instant;
import java.util.UUID;

public record StudentScoreTrendPointDto(
        String itemId,
        String title,
        String assessmentType,
        UUID courseId,
        String courseTitle,
        double scoreOutOf10,
        boolean passed,
        Instant recordedAt
) {
}
