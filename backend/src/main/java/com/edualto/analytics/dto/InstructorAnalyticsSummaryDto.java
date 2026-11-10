package com.edualto.analytics.dto;

import java.math.BigDecimal;

public record InstructorAnalyticsSummaryDto(
        long totalStudents,
        long newStudentsThisMonth,
        BigDecimal totalRevenue,
        BigDecimal revenueThisMonth,
        double averageCompletionRate,
        long totalCertificates,
        long totalCompletedLessons
) {
}
