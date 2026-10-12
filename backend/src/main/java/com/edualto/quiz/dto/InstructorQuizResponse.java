package com.edualto.quiz.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record InstructorQuizResponse(
        UUID id,
        UUID lessonId,
        BigDecimal passingScore,
        int questionsPerAttempt,
        int durationMinutes,
        boolean editable,
        List<Question> questions
) {
    public record Question(UUID id, String prompt, int position, List<Option> options) { }
    public record Option(UUID id, String label, boolean correct, int position) { }
}
