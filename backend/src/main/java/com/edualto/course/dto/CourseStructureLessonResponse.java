package com.edualto.course.dto;

import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import java.util.UUID;

public record CourseStructureLessonResponse(
        UUID id,
        String title,
        String slug,
        String description,
        LessonType lessonType,
        int position,
        Integer durationSeconds,
        boolean isPreview,
        LessonStatus status
) {
}
