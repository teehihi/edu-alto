package com.edualto.quiz.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record CreateQuizRequest(
        @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal passingScore,
        @NotEmpty @Size(max = 100) List<@Valid QuizQuestionRequest> questions
) {
}
