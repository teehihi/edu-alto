package com.edualto.course.dto;

public record CourseSummaryResponse(
        String id,
        String title,
        String category,
        String description,
        String instructorName,
        String price,
        double rating
) {
}
