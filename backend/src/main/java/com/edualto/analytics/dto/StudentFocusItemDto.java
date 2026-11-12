package com.edualto.analytics.dto;

import java.util.UUID;

public record StudentFocusItemDto(
        String id,
        String type,
        String priority,
        String title,
        String description,
        UUID courseId,
        String courseTitle,
        String actionHref,
        String actionLabel
) {
}
