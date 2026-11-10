package com.edualto.analytics.dto;

import java.math.BigDecimal;

public record InstructorMonthlyTrendDto(
        String month,
        String label,
        long newEnrollments,
        long completedCount,
        BigDecimal revenue,
        double completionRate
) {
}
