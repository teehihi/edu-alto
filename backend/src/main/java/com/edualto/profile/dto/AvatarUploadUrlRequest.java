package com.edualto.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AvatarUploadUrlRequest(
        @NotBlank(message = "Định dạng tệp không được để trống")
        String contentType,

        @NotNull(message = "Kích thước tệp không được để trống")
        @Positive(message = "Kích thước tệp phải lớn hơn 0")
        Long contentLength
) {
}
