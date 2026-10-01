package com.edualto.messaging.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        @Size(max = 4000, message = "Tin nhắn không được vượt quá 4000 ký tự")
        String body
) {
}
