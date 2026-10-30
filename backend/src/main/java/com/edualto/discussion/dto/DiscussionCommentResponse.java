package com.edualto.discussion.dto;

import java.time.Instant;
import java.util.UUID;

public record DiscussionCommentResponse(
        UUID id,
        UUID discussionId,
        UUID authorId,
        String authorName,
        String authorAvatarUrl,
        String authorRole,
        boolean isCourseInstructor,
        String body,
        UUID parentCommentId,
        Instant createdAt,
        boolean canDelete
) {
}
