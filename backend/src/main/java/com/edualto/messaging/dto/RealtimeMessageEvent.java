package com.edualto.messaging.dto;

import java.time.Instant;
import java.util.UUID;

public record RealtimeMessageEvent(
        String type,
        UUID conversationId,
        MessageResponse data,
        Instant occurredAt
) {
}
