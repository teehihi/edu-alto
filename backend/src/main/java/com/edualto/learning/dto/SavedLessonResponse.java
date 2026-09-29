package com.edualto.learning.dto;

import com.edualto.course.domain.LessonType;
import java.time.Instant;
import java.util.UUID;

public record SavedLessonResponse(
        UUID id,
        UUID lessonId,
        UUID courseId,
        String courseSlug,
        String courseTitle,
        String sectionTitle,
        String lessonTitle,
        LessonType lessonType,
        Integer durationSeconds,
        Instant savedAt
) {
}
