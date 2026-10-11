package com.edualto.course.dto;

import com.edualto.course.domain.LessonType;
import java.util.List;
import java.util.UUID;

public record LearningLessonResponse(UUID id, UUID courseId, UUID sectionId, String title,
                                     LessonType lessonType, String content, String description,
                                     List<String> objectives, List<LessonAttachmentResponse> attachments,
                                     String thumbnailUrl) {
}
