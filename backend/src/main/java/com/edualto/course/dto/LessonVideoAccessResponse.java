package com.edualto.course.dto;

import java.time.Instant;
import java.util.UUID;

public record LessonVideoAccessResponse(UUID lessonId, String videoUrl, Instant expiresAt) {
}
