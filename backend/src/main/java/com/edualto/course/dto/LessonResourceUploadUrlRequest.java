package com.edualto.course.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record LessonResourceUploadUrlRequest(
        @NotBlank(message = "Tên tệp không được để trống") String fileName,
        @NotBlank(message = "Định dạng tệp không được để trống") String contentType,
        @Min(value = 1, message = "Dung lượng tệp phải lớn hơn 0")
        @Max(value = 52428800, message = "Tệp không được vượt quá 50 MB")
        long contentLength
) {
}
