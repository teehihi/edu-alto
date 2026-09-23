package com.edualto.course.dto;

import java.util.List;
import java.util.UUID;

public record CourseStructureResponse(
        UUID courseId,
        String courseTitle,
        String courseSlug,
        int totalSections,
        int totalLessons,
        int totalDurationSeconds,
        List<CourseStructureSectionResponse> sections
) {
}
