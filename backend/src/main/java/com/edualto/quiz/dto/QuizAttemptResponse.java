package com.edualto.quiz.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuizAttemptResponse(
        UUID id,
        UUID quizId,
        BigDecimal score,
        int correctAnswers,
        int totalQuestions,
        boolean passed,
        Instant submittedAt,
        int activityEventCount,
        List<ReviewQuestion> review
) {
    public record ReviewQuestion(
            UUID questionId,
            int position,
            String prompt,
            UUID selectedOptionId,
            String selectedOptionLabel,
            UUID correctOptionId,
            String correctOptionLabel,
            boolean correct
    ) { }
}
