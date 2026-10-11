package com.edualto.course.dto;

import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

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

        LessonStatus status,

        @Size(max = 10, message = "Mỗi bài học có tối đa 10 mục tiêu")
        List<@NotBlank @Size(max = 300, message = "Mỗi mục tiêu không được vượt quá 300 ký tự") String> objectives
) {
    public UpdateLessonRequest(String title, String slug, String description, String content, LessonType lessonType,
            Integer durationSeconds, Boolean isPreview, String mediaKey, LessonStatus status) {
        this(title, slug, description, content, lessonType, durationSeconds, isPreview, mediaKey, status, null);
    }
}
