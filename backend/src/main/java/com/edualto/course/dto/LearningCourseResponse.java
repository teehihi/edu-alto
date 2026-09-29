package com.edualto.course.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record LearningCourseResponse(UUID id, UUID instructorId, BigDecimal price) {
}
