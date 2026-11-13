package com.edualto.analytics.dto;

import java.util.List;

public record StudentLearningAnalyticsOverviewResponse(
        int windowDays,
        StudentAnalyticsSummaryDto summary,
        List<StudentDailyActivityDto> currentWeekActivity,
        List<StudentDailyActivityDto> windowDailyActivity,
        List<StudentScoreTrendPointDto> scoreTrend,
        List<StudentCoursePerformanceSummaryDto> coursePerformances,
        List<StudentFocusItemDto> focusItems,
        StudentCompletionPredictionDto prediction
) {
}
