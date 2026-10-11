package com.edualto.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CurriculumLessonDto(
        @NotBlank(message = "Tiêu đề bài học không được để trống")
        @Size(max = 255, message = "Tiêu đề bài học không được vượt quá 255 ký tự")
        String title,
        @Size(max = 500, message = "Giới thiệu bài học không được vượt quá 500 ký tự")
        String introduction,
        @Size(max = 20000, message = "Mô tả bài học không được vượt quá 20.000 ký tự")
        String description,
        @NotNull(message = "Danh sách mục tiêu bài học không được để trống")
        @Size(max = 10, message = "Mỗi bài học có tối đa 10 mục tiêu")
        List<@NotNull @Size(max = 300, message = "Mỗi mục tiêu không được vượt quá 300 ký tự") String> objectives,
        @Min(value = 0, message = "Thời lượng bài học không được âm")
        @Max(value = 600, message = "Thời lượng bài học không được vượt quá 600 phút")
        Integer durationMinutes
) { }
