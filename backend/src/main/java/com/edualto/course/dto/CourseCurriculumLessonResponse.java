package com.edualto.course.dto;

import com.edualto.course.domain.LessonType;
import java.util.UUID;

public record CourseCurriculumLessonResponse(
        UUID id,
        String title,
        LessonType lessonType,
        Integer durationSeconds,
        boolean preview
) {
}
