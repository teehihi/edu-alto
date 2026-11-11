package com.edualto.enrollment.domain;

import java.time.Instant;
import java.util.UUID;

public record CourseEnrolledEvent(
        UUID studentId,
        UUID courseId,
        UUID enrollmentId,
        Instant occurredAt,
        String metadata
) {
}
