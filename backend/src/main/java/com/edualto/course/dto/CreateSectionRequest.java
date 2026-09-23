package com.edualto.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSectionRequest(
        @NotBlank(message = "Tiêu đề chương học không được để trống")
        @Size(max = 255, message = "Tiêu đề chương học không được vượt quá 255 ký tự")
        String title,

        @Size(max = 2000, message = "Mô tả chương học không được vượt quá 2000 ký tự")
        String description
) {
}
