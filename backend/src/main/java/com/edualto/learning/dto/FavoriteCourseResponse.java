package com.edualto.learning.dto;

import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.CourseInstructorSummaryResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FavoriteCourseResponse(
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
        Instant savedAt
) {
}
