package com.edualto.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record LearnerInstructorAnnouncementResponse(
        UUID id,
        String instructorName,
        String title,
        String description,
        String linkUrl,
        String imageUrl,
        Instant publishedAt
) { }
