package com.edualto.analytics.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record InstructorCoursePerformanceDto(
        UUID courseId,
        String courseTitle,
        String courseStatus,
        BigDecimal price,
        long studentCount,
        long completedStudentsCount,
        double completionRate,
        long totalLessons,
        BigDecimal revenue,
        double averageRating,
        long reviewCount
) {
}
