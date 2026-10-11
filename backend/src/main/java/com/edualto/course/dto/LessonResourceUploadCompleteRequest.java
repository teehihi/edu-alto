package com.edualto.course.dto;

import jakarta.validation.constraints.NotBlank;

public record LessonResourceUploadCompleteRequest(
        @NotBlank(message = "Khóa tệp không được để trống") String objectKey,
        @NotBlank(message = "Tên tệp không được để trống") String fileName
) {
}
