package com.edualto.learning.dto;

import java.util.List;
import java.util.UUID;

public record CourseProgressResponse(UUID courseId, long totalLessons, long completedLessons,
                                     int progressPercent, boolean completed, List<UUID> completedLessonIds) {
}
