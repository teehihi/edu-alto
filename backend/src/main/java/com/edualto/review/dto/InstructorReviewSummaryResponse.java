package com.edualto.review.dto;

import java.math.BigDecimal;
import java.util.List;

public record InstructorReviewSummaryResponse(
        BigDecimal averageRating,
        long reviewCount,
        List<CourseReviewRatingCountResponse> ratingCounts
) {
}
