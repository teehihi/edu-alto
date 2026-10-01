package com.edualto.messaging.dto;

import java.time.Instant;
import java.util.UUID;

public record MessageResponse(UUID id, UUID senderId, String body, Instant createdAt, Instant readAt) {
}
