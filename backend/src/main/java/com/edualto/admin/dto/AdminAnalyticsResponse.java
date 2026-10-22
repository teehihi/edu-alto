package com.edualto.admin.dto;

import java.math.BigDecimal;
import java.util.List;

public record AdminAnalyticsResponse(
        List<PaymentMethodStatDto> paymentMethods,
        long completedLessonsCount,
        double courseCompletionRate,
        double averageQuizScore,
        double averageCourseRating,
        long totalReviewsCount,
        long totalEnrollmentsCount
) {
}
