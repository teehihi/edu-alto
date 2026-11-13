package com.edualto.analytics.dto;

import java.time.Instant;
import java.util.UUID;

public record InstructorAtRiskStudentDto(
        UUID studentId,
        String studentName,
        String studentEmail,
        UUID courseId,
        String courseTitle,
        String riskLevel,
        String statusBadge,
        String badgeColor,
        int completionProbabilityPct,
        String primaryFactor,
        String primaryFactorLabel,
        int daysSinceLastActivity,
        Instant enrolledAt,
        String actionHref
) {
}
