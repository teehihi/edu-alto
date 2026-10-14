package com.edualto.notification.dto;

import java.time.Instant;
import java.util.UUID;

public record LearnerNotificationResponse(UUID id, String type, String instructorName, String instructorAvatarUrl, String title,
                                          String description, String linkUrl, String imageUrl, Instant createdAt) {
}
