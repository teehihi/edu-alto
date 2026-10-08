package com.edualto.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSectionRequest(
        @NotBlank(message = "Tiêu đề chương học không được để trống")
        @Size(max = 255, message = "Tiêu đề chương học không được vượt quá 255 ký tự")
        String title,

        @Size(max = 500, message = "Giới thiệu chương học không được vượt quá 500 ký tự")
        String introduction,

        @Size(max = 100000, message = "Mô tả chương học không được vượt quá giới hạn cho phép")
        String description,

        @Size(max = 255, message = "Meta title không được vượt quá 255 ký tự")
        String metaTitle,

        @Size(max = 500, message = "Meta description không được vượt quá 500 ký tự")
        String metaDescription
) {
    public CreateSectionRequest(String title, String description) {
        this(title, null, description, null, null);
    }
}
