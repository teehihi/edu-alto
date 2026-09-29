package com.edualto.review.dto;

import java.time.Instant;
import java.util.UUID;

public record CourseReviewResponse(
        UUID id,
        UUID courseId,
        UUID studentId,
        String studentName,
        int rating,
        String comment,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}
