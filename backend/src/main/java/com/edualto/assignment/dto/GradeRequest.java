package com.edualto.assignment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record GradeRequest(
        @NotNull(message = "Điểm bài làm không được để trống")
        @DecimalMin(value = "0.00", message = "Điểm bài làm không được âm")
        BigDecimal score,
        @Size(max = 20000, message = "Nhận xét tối đa 20.000 ký tự")
        String feedback
) { }
