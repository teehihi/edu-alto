package com.edualto.analytics.dto;

public record StudentDailyActivityDto(
        String date,
        String label,
        String fullLabel,
        double studyHours,
        int studyMinutes,
        long completedLessons,
        boolean today
) {
}
