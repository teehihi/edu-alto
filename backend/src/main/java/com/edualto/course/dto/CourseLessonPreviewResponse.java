package com.edualto.course.dto;

import com.edualto.course.domain.LessonType;
import java.util.UUID;

public record CourseLessonPreviewResponse(
        UUID id,
        String title,
        LessonType lessonType,
        String textContent
) {
}
