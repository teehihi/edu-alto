package com.edualto.analytics.dto;

import java.util.UUID;

public record InstructorCourseMetricsResponse(
        UUID courseId,
        long chapterCount,
        long publicReviewCount,
        long paidOrderCount,
        long activeEnrollmentCount,
        long wishlistCount,
        long certificateCount
) {
}
