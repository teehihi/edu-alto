package com.edualto.learning.dto;

import java.util.Map;

public record LearningActivitySummaryResponse(
        long totalActivities,
        long distinctActiveDays,
        Map<String, Long> countByCategory
) {
}
