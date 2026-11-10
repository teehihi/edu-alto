package com.edualto.learning.dto;

public record LearningActivitySyncResponse(
        int lessonsSynced,
        int quizzesSynced,
        int assignmentsSynced,
        int enrollmentsSynced,
        long totalActivities
) {
}
