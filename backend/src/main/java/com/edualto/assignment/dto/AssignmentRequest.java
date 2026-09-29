package com.edualto.assignment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public record AssignmentRequest(
        @NotBlank(message = "Tiêu đề bài tập không được để trống")
        @Size(max = 255, message = "Tiêu đề bài tập tối đa 255 ký tự")
        String title,
        @NotBlank(message = "Mô tả bài tập không được để trống")
        String description,
        Instant dueAt,
        @NotNull(message = "Điểm tối đa không được để trống")
        @DecimalMin(value = "0.01", message = "Điểm tối đa phải lớn hơn 0")
        BigDecimal maxScore
) { }
