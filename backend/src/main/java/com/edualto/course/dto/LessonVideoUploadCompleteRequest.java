package com.edualto.course.dto;

import jakarta.validation.constraints.NotBlank;

public record LessonVideoUploadCompleteRequest(
        @NotBlank(message = "Khóa video không được để trống")
        String objectKey
) {
}
