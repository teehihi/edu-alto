package com.edualto.analytics.dto;

import java.util.List;

public record InstructorAnalyticsOverviewResponse(
        InstructorAnalyticsSummaryDto summary,
        List<InstructorMonthlyTrendDto> monthlyTrends,
        List<InstructorCoursePerformanceDto> coursePerformances,
        List<InstructorAtRiskStudentDto> atRiskStudents
) {
}
