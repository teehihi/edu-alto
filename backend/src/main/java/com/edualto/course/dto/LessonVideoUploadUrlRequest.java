package com.edualto.course.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record LessonVideoUploadUrlRequest(
        @NotBlank(message = "Định dạng video không được để trống")
        String contentType,
        @Min(value = 1, message = "Dung lượng video phải lớn hơn 0")
        @Max(value = 2147483648L, message = "Video không được vượt quá 2 GB")
        long contentLength
) {
}
