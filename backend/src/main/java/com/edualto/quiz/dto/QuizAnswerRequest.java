package com.edualto.quiz.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record QuizAnswerRequest(@NotNull UUID questionId, @NotNull UUID optionId) {
}
