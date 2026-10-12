package com.edualto.quiz.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record CreateQuizRequest(
        @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal passingScore,
        @Min(0) @Max(100) int questionsPerAttempt,
        @Min(0) @Max(600) int durationMinutes,
        @NotEmpty @Size(max = 100) List<@Valid QuizQuestionRequest> questions
) {
}
