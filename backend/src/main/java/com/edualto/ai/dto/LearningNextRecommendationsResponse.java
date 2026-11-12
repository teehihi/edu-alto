package com.edualto.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LearningNextRecommendationsResponse(
        UUID snapshotId,
        String algorithmVersion,
        boolean personalizationEnabled,
        Instant generatedAt,
        List<LearningNextItemResponse> items
) {
}
