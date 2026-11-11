package com.edualto.learning.dto;

public record LearningActivitySyncResponse(
        int lessonsSynced,
        int quizzesSynced,
        int assignmentsSynced,
        int enrollmentsSynced,
        int certificatesSynced,
        int notesSynced,
        int discussionsSynced,
        int commentsSynced,
        long totalActivities
) {
    public LearningActivitySyncResponse(
            int lessonsSynced,
            int quizzesSynced,
            int assignmentsSynced,
            int enrollmentsSynced,
            long totalActivities
    ) {
        this(lessonsSynced, quizzesSynced, assignmentsSynced, enrollmentsSynced, 0, 0, 0, 0, totalActivities);
    }
}
