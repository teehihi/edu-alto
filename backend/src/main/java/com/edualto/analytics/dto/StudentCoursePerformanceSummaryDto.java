package com.edualto.analytics.dto;

import java.time.Instant;
import java.util.UUID;

public record StudentCoursePerformanceSummaryDto(
        UUID courseId,
        String courseTitle,
        String courseSlug,
        long totalLessons,
        long completedLessons,
        int completionPercent,
        Double bestQuizAverageOutOf10,
        long attemptedQuizzesCount,
        long totalQuizzesCount,
        long passedQuizzesCount,
        Double assignmentAverageOutOf10,
        long submittedAssignmentsCount,
        long totalAssignmentsCount,
        Instant lastActivityAt
) {
}
