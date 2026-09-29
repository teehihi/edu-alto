package com.edualto.assignment.dto;

import com.edualto.assignment.domain.AssignmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AssignmentResponse(
        UUID id,
        UUID courseId,
        String courseTitle,
        String title,
        String description,
        Instant dueAt,
        BigDecimal maxScore,
        AssignmentStatus status,
        Instant publishedAt,
        Instant submittedAt,
        String responseText,
        BigDecimal score,
        String feedback,
        Instant gradedAt
) { }
