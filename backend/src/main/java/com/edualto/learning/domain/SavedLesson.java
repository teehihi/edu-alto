package com.edualto.learning.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "saved_lessons")
public class SavedLesson {
    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "lesson_id", nullable = false, updatable = false)
    private UUID lessonId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SavedLesson() {
    }

    public SavedLesson(UUID id, UUID userId, UUID lessonId) {
        this.id = id;
        this.userId = userId;
        this.lessonId = lessonId;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getLessonId() {
        return lessonId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
