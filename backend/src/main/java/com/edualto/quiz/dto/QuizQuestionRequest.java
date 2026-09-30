package com.edualto.quiz.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record QuizQuestionRequest(
        @NotBlank @Size(max = 2000) String prompt,
        @NotEmpty @Size(min = 2, max = 6) List<@Valid QuizOptionRequest> options
) {
}
