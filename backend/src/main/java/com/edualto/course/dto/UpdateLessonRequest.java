package com.edualto.course.dto;

import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateLessonRequest(
        @NotBlank(message = "Tiêu đề bài học không được để trống")
        @Size(max = 255, message = "Tiêu đề bài học không được vượt quá 255 ký tự")
        String title,

        @Size(max = 255, message = "Đường dẫn bài học không được vượt quá 255 ký tự")
        String slug,

        @Size(max = 2000, message = "Mô tả bài học không được vượt quá 2000 ký tự")
        String description,

        String content,

        LessonType lessonType,

        @Min(value = 0, message = "Thời lượng bài học phải lớn hơn hoặc bằng 0")
        Integer durationSeconds,

        Boolean isPreview,

        @Size(max = 512, message = "Khóa phương tiện (mediaKey) không được vượt quá 512 ký tự")
        String mediaKey,

        LessonStatus status
) {
}
