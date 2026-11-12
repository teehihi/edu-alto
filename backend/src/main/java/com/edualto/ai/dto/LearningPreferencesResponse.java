package com.edualto.ai.dto;

import com.edualto.course.domain.CourseLevel;
import java.util.List;

public record LearningPreferencesResponse(
        List<String> preferredTopics,
        CourseLevel preferredLevel,
        String learningGoal,
        Integer weeklyTargetHours,
        boolean personalizationEnabled,
        boolean onboardingCompleted,
        List<String> suggestedTopics
) {
}
