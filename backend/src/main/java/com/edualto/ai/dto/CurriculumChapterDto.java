package com.edualto.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CurriculumChapterDto(
        @NotBlank(message = "Tiêu đề chương không được để trống")
        @Size(max = 255, message = "Tiêu đề chương không được vượt quá 255 ký tự")
        String title,
        @Size(max = 500, message = "Giới thiệu chương không được vượt quá 500 ký tự")
        String introduction,
        @Size(max = 20000, message = "Mô tả chương không được vượt quá 20.000 ký tự")
        String description,
        @NotEmpty(message = "Mỗi chương cần ít nhất một bài học")
        @Size(max = 100, message = "Mỗi lần nhập không được vượt quá 100 bài học")
        List<@NotNull @Valid CurriculumLessonDto> lessons
) { }
