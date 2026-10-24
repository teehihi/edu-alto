package com.edualto.admin.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AdminTopCourseDto(
        UUID id,
        String title,
        String instructorName,
        long studentsCount,
        BigDecimal revenue,
        double rating
) {
}
