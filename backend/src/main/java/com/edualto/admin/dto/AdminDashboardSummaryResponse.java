package com.edualto.admin.dto;

import java.math.BigDecimal;
import java.util.List;

public record AdminDashboardSummaryResponse(
        BigDecimal totalRevenue,
        long pendingOrdersCount,
        long totalCoursesCount,
        long publishedCoursesCount,
        long draftCoursesCount,
        long totalUsersCount,
        long totalStudentsCount,
        long totalInstructorsCount,
        List<MonthlyRevenueDto> monthlyStats,
        List<CategoryDistributionDto> categoryDistribution,
        List<AdminTopCourseDto> topCourses
) {
}
