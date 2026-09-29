package com.edualto.assignment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmissionRequest(
        @NotBlank(message = "Nội dung bài nộp không được để trống")
        @Size(max = 50000, message = "Nội dung bài nộp tối đa 50.000 ký tự")
        String responseText
) { }
