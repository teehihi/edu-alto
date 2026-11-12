package com.edualto.learning.dto;

import java.util.UUID;

public record CourseProgressSummaryResponse(
        UUID courseId,
        long totalLessons,
        long completedLessons,
        int progressPercent,
        boolean completed
) {
}
