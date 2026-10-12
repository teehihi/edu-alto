package com.edualto.quiz.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record SubmitQuizRequest(
        @NotNull UUID sessionId,
        @NotNull @Size(max = 100) List<@Valid QuizAnswerRequest> answers,
        @Size(max = 1000) List<@Valid QuizAttemptActivityEventRequest> activityEvents
) {
}
