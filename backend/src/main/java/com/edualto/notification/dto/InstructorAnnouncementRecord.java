package com.edualto.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record InstructorAnnouncementRecord(
        UUID id,
        String instructorName,
        String title,
        String description,
        String linkUrl,
        String imageKey,
        Instant publishedAt
) { }
