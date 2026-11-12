package com.edualto.ai.dto;

import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.CourseInstructorSummaryResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CourseRecommendationItemResponse(
        UUID itemId,
        UUID id,
        String title,
        String slug,
        String tagline,
        String thumbnailUrl,
        BigDecimal price,
        BigDecimal originalPrice,
        CourseLevel level,
        String language,
        CourseStatus status,
        Instant publishedAt,
        CourseInstructorSummaryResponse instructor,
        double score,
        String tier,
        String reasonCode,
        String reasonText
) {
}
