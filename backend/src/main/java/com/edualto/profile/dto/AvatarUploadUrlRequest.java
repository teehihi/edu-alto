package com.edualto.profile.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AvatarUploadUrlRequest(
        @NotBlank(message = "Định dạng tệp không được để trống")
        String contentType,

        @NotNull(message = "Kích thước tệp không được để trống")
        @Positive(message = "Kích thước tệp phải lớn hơn 0")
        @Max(value = 5 * 1024 * 1024, message = "Kích thước ảnh đại diện không được vượt quá 5MB")
        Long contentLength
) {
}
