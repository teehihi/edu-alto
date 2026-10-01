package com.edualto.review.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InstructorReviewReplyRequest(
        @NotBlank(message = "Phản hồi không được để trống")
        @Size(max = 2000, message = "Phản hồi không được vượt quá 2000 ký tự")
        String reply
) {
}
