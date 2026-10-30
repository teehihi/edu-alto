package com.edualto.discussion.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDiscussionRequest(
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(min = 3, max = 200, message = "Tiêu đề câu hỏi từ 3 đến 200 ký tự")
        String title,

        @NotBlank(message = "Nội dung không được để trống")
        @Size(min = 3, max = 5000, message = "Nội dung câu hỏi từ 3 đến 5000 ký tự")
        String body,

        @Min(value = 0, message = "Mốc thời gian video không hợp lệ")
        Integer videoTimestampSeconds
) {
}
