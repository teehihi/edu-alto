package com.edualto.learning.domain;

import java.time.Instant;
import java.util.UUID;

public record CourseWishlistEvent(
        UUID userId,
        UUID courseId,
        boolean added,
        Instant occurredAt
) {
}
