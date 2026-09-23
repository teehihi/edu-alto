package com.edualto.course.dto;

import java.util.List;
import java.util.UUID;

public record CourseStructureSectionResponse(
        UUID id,
        String title,
        String description,
        int position,
        int lessonCount,
        int totalDurationSeconds,
        List<CourseStructureLessonResponse> lessons
) {
}
