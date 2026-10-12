package com.edualto.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record QuizQuestionGenerationRequest(
        @NotNull UUID courseId,
        @NotNull UUID sectionId,
        UUID lessonId,
        @Size(max = 255) String title,
        @Size(max = 10000) String description,
        @Size(max = 100000) String content,
        @Size(max = 500) String focus,
        boolean includeTitle,
        boolean includeDescription,
        boolean includeContent,
        @Size(max = 20) List<UUID> attachmentIds,
        boolean pendingResourceVisibleToStudents,
        @Min(1) @Max(20) int questionCount
) { }
