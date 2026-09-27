package com.edualto.course.dto;

import java.util.List;
import java.util.UUID;

public record CourseCurriculumResponse(
        UUID courseId,
        String slug,
        List<CourseCurriculumSectionResponse> sections
) {
}
