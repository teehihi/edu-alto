package com.edualto.messaging.dto;

import java.time.Instant;
import java.util.UUID;

public record ConversationResponse(
        UUID id,
        UUID instructorId,
        String instructorName,
        UUID studentId,
        String studentName,
        String lastMessage,
        Instant lastMessageAt,
        long unreadCount,
        boolean blocked
) {
}
