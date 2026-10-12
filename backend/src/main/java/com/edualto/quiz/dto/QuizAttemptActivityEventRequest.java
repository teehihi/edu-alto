package com.edualto.quiz.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;

public record QuizAttemptActivityEventRequest(
        @NotNull @Pattern(regexp = "TAB_HIDDEN|WINDOW_BLUR") String eventType,
        @NotNull Instant occurredAt
) {
}
