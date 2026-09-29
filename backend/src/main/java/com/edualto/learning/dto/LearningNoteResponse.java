package com.edualto.learning.dto;

import com.edualto.learning.domain.LearningNote;
import java.time.Instant;
import java.util.UUID;

public record LearningNoteResponse(
        UUID id,
        String title,
        String content,
        UUID lessonId,
        Integer videoSecond,
        Instant createdAt,
        Instant updatedAt
) {
    public static LearningNoteResponse from(LearningNote note) {
        return new LearningNoteResponse(note.getId(), note.getTitle(), note.getContent(), note.getLessonId(),
                note.getVideoSecond(), note.getCreatedAt(), note.getUpdatedAt());
    }
}
