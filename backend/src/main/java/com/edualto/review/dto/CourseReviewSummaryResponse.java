package com.edualto.review.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CourseReviewSummaryResponse(
        UUID courseId,
        BigDecimal averageRating,
        long reviewCount,
        List<CourseReviewRatingCountResponse> ratingCounts
) {
}
