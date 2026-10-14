package com.edualto.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record LearnerNotificationRecord(UUID id, String type, String instructorName, String instructorAvatarKey, String title,
                                        String description, String linkUrl, String imageKey, Instant createdAt) {
}
