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
        Instant updatedAt,
        String instructorReply,
        Instant instructorRepliedAt,
        String studentAvatarUrl
) {
    public CourseReviewResponse(
            UUID id,
            UUID courseId,
            UUID studentId,
            String studentName,
            int rating,
            String comment,
            String status,
            Instant createdAt,
            Instant updatedAt,
            String instructorReply,
            Instant instructorRepliedAt
    ) {
        this(id, courseId, studentId, studentName, rating, comment, status, createdAt, updatedAt,
                instructorReply, instructorRepliedAt, null);
    }

    public CourseReviewResponse withStudentAvatarUrl(String avatarUrl) {
        return new CourseReviewResponse(id, courseId, studentId, studentName, rating, comment, status,
                createdAt, updatedAt, instructorReply, instructorRepliedAt, avatarUrl);
    }
}
