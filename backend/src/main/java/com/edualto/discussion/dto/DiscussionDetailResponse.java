package com.edualto.discussion.dto;

import com.edualto.discussion.domain.DiscussionStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DiscussionDetailResponse(
        UUID id,
        UUID courseId,
        UUID lessonId,
        UUID authorId,
        String authorName,
        String authorAvatarUrl,
        String authorRole,
        boolean isCourseInstructor,
        String title,
        String body,
        Integer videoTimestampSeconds,
        DiscussionStatus status,
        long commentCount,
        Instant createdAt,
        Instant updatedAt,
        boolean canDelete,
        List<DiscussionCommentResponse> comments
) {
}
