package com.edualto.quiz.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record QuizOptionRequest(
        @NotBlank @Size(max = 500) String label,
        boolean correct
) {
}
