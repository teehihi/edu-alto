package com.edualto.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CourseReviewRequest(
        @Min(value = 1, message = "Điểm đánh giá phải từ 1 đến 5")
        @Max(value = 5, message = "Điểm đánh giá phải từ 1 đến 5")
        int rating,
        @NotBlank(message = "Nội dung đánh giá không được để trống")
        @Size(max = 2000, message = "Nội dung đánh giá không được vượt quá 2000 ký tự")
        String comment
) {
}
