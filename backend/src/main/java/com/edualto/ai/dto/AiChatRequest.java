package com.edualto.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record AiChatRequest(
        @NotBlank(message = "Vui lòng nhập câu hỏi") @Size(max = 2000, message = "Câu hỏi tối đa 2000 ký tự") String message,
        @Size(max = 12, message = "Lịch sử tối đa 12 tin nhắn") List<@Valid HistoryMessage> history,
        UUID courseId
) {
    public record HistoryMessage(
            @NotBlank(message = "Vai trò hội thoại không được để trống") @Pattern(regexp = "user|assistant", message = "Vai trò hội thoại chưa hợp lệ") String role,
            @NotBlank(message = "Tin nhắn không được để trống") @Size(max = 2000, message = "Mỗi tin nhắn tối đa 2000 ký tự") String text
    ) { }
}
