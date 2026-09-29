package com.edualto.course.dto;

import com.edualto.course.domain.LessonType;
import java.util.UUID;

public record LearningLessonResponse(UUID id, UUID courseId, UUID sectionId, String title,
                                     LessonType lessonType, String content) {
}
