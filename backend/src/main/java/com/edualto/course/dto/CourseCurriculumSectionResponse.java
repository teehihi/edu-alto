package com.edualto.course.dto;

import java.util.List;
import java.util.UUID;

public record CourseCurriculumSectionResponse(
        UUID id,
        String title,
        List<CourseCurriculumLessonResponse> lessons
) {
}
