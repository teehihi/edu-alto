package com.edualto.ai.dto;

import java.util.UUID;

public record LearningNextItemResponse(
        UUID itemId,
        String itemType,
        UUID targetId,
        UUID courseId,
        String courseTitle,
        String courseSlug,
        UUID lessonId,
        String lessonTitle,
        String sectionTitle,
        String targetUrl,
        String actionLabel,
        double score,
        String tier,
        String reasonCode,
        String reasonText,
        Integer estimatedMinutes,
        long completedLessons,
        long totalLessons
) {
}
