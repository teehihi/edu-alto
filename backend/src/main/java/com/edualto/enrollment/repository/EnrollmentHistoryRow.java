package com.edualto.enrollment.repository;

import java.time.Instant;
import java.util.UUID;

public record EnrollmentHistoryRow(
        UUID id,
        UUID courseId,
        String courseTitle,
        String courseSlug,
        String courseStatus,
        String status,
        Instant enrolledAt,
        String thumbnailKey
) {
}
