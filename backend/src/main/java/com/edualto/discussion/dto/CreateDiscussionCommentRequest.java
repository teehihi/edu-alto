package com.edualto.discussion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateDiscussionCommentRequest(
        @NotBlank(message = "Nội dung phản hồi không được để trống")
        @Size(min = 1, max = 3000, message = "Nội dung phản hồi từ 1 đến 3000 ký tự")
        String body,

        UUID parentCommentId
) {
}
