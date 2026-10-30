package com.edualto.notification.dto;

import com.edualto.notification.domain.NotificationType;
import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        UUID recipientId,
        NotificationType type,
        String title,
        String message,
        String linkUrl,
        Instant readAt,
        Instant createdAt
) {
}
