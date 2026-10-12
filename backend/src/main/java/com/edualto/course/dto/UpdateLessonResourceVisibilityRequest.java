package com.edualto.course.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateLessonResourceVisibilityRequest(@NotNull Boolean visibleToStudents) {
}
