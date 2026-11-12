package com.edualto.analytics.dto;

import java.time.Instant;
import java.util.UUID;

public record StudentCourseQuizItemDto(
        UUID quizId,
        UUID lessonId,
        String lessonTitle,
        String sectionTitle,
        double passingScoreOutOf10,
        Double bestScoreOutOf10,
        Double latestScoreOutOf10,
        boolean passed,
        int attemptCount,
        Instant lastAttemptAt
) {
}
