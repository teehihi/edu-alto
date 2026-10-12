package com.edualto.quiz.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuizAttemptSessionResponse(
        UUID id,
        UUID quizId,
        Instant startedAt,
        Instant expiresAt,
        BigDecimal passingScore,
        List<QuizResponse.Question> questions
) {
}
