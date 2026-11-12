package com.edualto.analytics.dto;

import java.util.List;

public record StudentCourseAnalyticsResponse(
        StudentCoursePerformanceSummaryDto course,
        List<StudentCourseQuizItemDto> quizzes,
        List<StudentCourseAssignmentItemDto> assignments,
        List<StudentFocusItemDto> focusItems
) {
}
