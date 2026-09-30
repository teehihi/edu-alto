package com.edualto.quiz.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SubmitQuizRequest(@NotEmpty @Size(max = 100) List<@Valid QuizAnswerRequest> answers) {
}
