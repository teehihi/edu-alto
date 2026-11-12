package com.edualto.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CourseRecommendationsResponse(
        UUID snapshotId,
        String algorithmVersion,
        boolean personalized,
        boolean personalizationEnabled,
        boolean onboardingCompleted,
        Instant generatedAt,
        List<CourseRecommendationItemResponse> items
) {
}
