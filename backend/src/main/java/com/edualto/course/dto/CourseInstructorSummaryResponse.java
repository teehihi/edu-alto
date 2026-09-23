package com.edualto.course.dto;

import java.util.UUID;

public record CourseInstructorSummaryResponse(
        UUID id,
        String fullName,
        String avatarUrl,
        String headline,
        String customHandle
) {
}
