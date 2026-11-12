package com.edualto.analytics.dto;

import java.time.Instant;
import java.util.UUID;

public record StudentCourseAssignmentItemDto(
        UUID assignmentId,
        String title,
        Instant dueAt,
        double maxScore,
        boolean submitted,
        Instant submittedAt,
        boolean late,
        Double rawScore,
        Double scoreOutOf10,
        Instant gradedAt
) {
}
