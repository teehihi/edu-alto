package com.edualto.notification.dto;

import com.edualto.notification.domain.NotificationAudience;
import com.edualto.notification.domain.NotificationStatus;
import java.time.Instant;
import java.util.UUID;

public record InstructorNotificationResponse(
        UUID id,
        String title,
        String description,
        String linkUrl,
        NotificationAudience audience,
        String imageKey,
        String imageUrl,
        NotificationStatus status,
        Instant startsAt,
        Instant endsAt,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt
) { }
