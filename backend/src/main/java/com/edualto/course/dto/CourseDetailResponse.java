package com.edualto.course.dto;

import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CourseDetailResponse(
        UUID id,
        String title,
        String slug,
        String tagline,
        String description,
        String thumbnailUrl,
        BigDecimal price,
        BigDecimal originalPrice,
        CourseLevel level,
        String language,
        CourseStatus status,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt,
        CourseInstructorSummaryResponse instructor
) {
}
