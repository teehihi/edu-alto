package com.edualto.course.dto;

import java.io.Serializable;
import java.util.List;

public record CourseCatalogResponse(
        List<CourseListItemResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) implements Serializable {
}
