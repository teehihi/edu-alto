package com.edualto.learning.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "saved_lesson_resources")
public class SavedLessonResource {
    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "attachment_id", nullable = false, updatable = false)
    private UUID attachmentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SavedLessonResource() {
    }

    public SavedLessonResource(UUID id, UUID userId, UUID attachmentId) {
        this.id = id;
        this.userId = userId;
        this.attachmentId = attachmentId;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getAttachmentId() {
        return attachmentId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
