package com.edualto.messaging.dto;

import jakarta.validation.constraints.NotNull;

public record BlockConversationRequest(@NotNull(message = "Trạng thái chặn là bắt buộc") Boolean blocked) {
}
