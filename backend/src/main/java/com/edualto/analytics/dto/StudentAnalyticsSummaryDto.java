package com.edualto.analytics.dto;

public record StudentAnalyticsSummaryDto(
        int activeCourseCount,
        long totalLessons,
        long completedLessons,
        double completionRate,
        Double overallAverageScoreOutOf10,
        Double averageQuizScoreOutOf10,
        Double quizPassRate,
        long attemptedQuizzesCount,
        long passedQuizzesCount,
        Double averageAssignmentScoreOutOf10,
        long publishedAssignmentsCount,
        long submittedAssignmentsCount,
        long onTimeAssignmentsCount,
        int currentStreakDays,
        int longestStreakDays,
        int activeDaysInWindow,
        double estimatedStudyHoursInWindow,
        long completedLessonsInWindow,
        double currentWeekHours,
        int currentWeekActiveDays
) {
}
