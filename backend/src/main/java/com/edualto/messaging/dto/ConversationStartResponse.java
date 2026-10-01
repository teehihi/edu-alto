package com.edualto.messaging.dto;

import java.util.UUID;

public record ConversationStartResponse(UUID conversationId, MessageResponse message) {
}
