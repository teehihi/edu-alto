package com.edualto.course.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CourseThumbnailUploadUrlRequest(
        @NotBlank(message = "Định dạng tệp ảnh không được để trống")
        String contentType,

        @NotNull(message = "Dung lượng tệp ảnh không được để trống")
        @Min(value = 1, message = "Dung lượng tệp phải lớn hơn 0")
        Long contentLength
) {
}
