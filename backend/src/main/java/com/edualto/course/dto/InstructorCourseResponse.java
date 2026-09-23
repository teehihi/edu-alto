package com.edualto.course.dto;

import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InstructorCourseResponse(
        UUID id,
        String title,
        String slug,
        String tagline,
        String description,
        String thumbnailKey,
        String thumbnailUrl,
        BigDecimal price,
        BigDecimal originalPrice,
        CourseLevel level,
        String language,
        CourseStatus status,
        Instant createdAt,
        Instant updatedAt,
        Instant publishedAt
) {
}
