package com.edualto.quiz.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record QuizAttemptResponse(
        UUID id,
        UUID quizId,
        BigDecimal score,
        int correctAnswers,
        int totalQuestions,
        boolean passed,
        Instant submittedAt
) {
}
