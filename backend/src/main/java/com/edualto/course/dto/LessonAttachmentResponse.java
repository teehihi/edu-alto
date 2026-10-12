package com.edualto.course.dto;

import java.util.UUID;

public record LessonAttachmentResponse(
        UUID id,
        String fileName,
        String contentType,
        long contentLength,
        boolean visibleToStudents
) {
}
