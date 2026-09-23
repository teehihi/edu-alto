package com.edualto.course.dto;

import com.edualto.course.domain.CourseLevel;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateCourseRequest(
        @NotBlank(message = "Tiêu đề khóa học không được để trống")
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        String title,

        @Size(max = 255, message = "Đường dẫn (slug) tối đa 255 ký tự")
        String slug,

        @Size(max = 500, message = "Tagline tối đa 500 ký tự")
        String tagline,

        @NotBlank(message = "Mô tả khóa học không được để trống")
        String description,

        @DecimalMin(value = "0.0", message = "Giá khóa học không được âm")
        BigDecimal price,

        @DecimalMin(value = "0.0", message = "Giá gốc khóa học không được âm")
        BigDecimal originalPrice,

        CourseLevel level,

        @Size(max = 20, message = "Mã ngôn ngữ tối đa 20 ký tự")
        String language,

        @Size(max = 512, message = "Mã ảnh thu nhỏ tối đa 512 ký tự")
        String thumbnailKey
) {
}
