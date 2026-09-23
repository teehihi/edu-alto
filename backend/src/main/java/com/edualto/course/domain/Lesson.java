package com.edualto.course.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "lessons")
public class Lesson {

    @Id
    private UUID id;

    @Column(name = "section_id", nullable = false)
    private UUID sectionId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "slug", length = 255)
    private String slug;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "content", columnDefinition = "text")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "lesson_type", nullable = false, length = 40)
    private LessonType lessonType;

    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "is_preview", nullable = false)
    private boolean isPreview;

    @Column(name = "media_key", length = 512)
    private String mediaKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private LessonStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Lesson() {
    }

    public Lesson(
            UUID id,
            UUID sectionId,
            String title,
            String slug,
            String description,
            String content,
            LessonType lessonType,
            Integer position,
            Integer durationSeconds,
            boolean isPreview,
            String mediaKey,
            LessonStatus status
    ) {
        this.id = Objects.requireNonNull(id, "Lesson id must not be null");
        this.sectionId = Objects.requireNonNull(sectionId, "Section id must not be null");
        this.title = Objects.requireNonNull(title, "Lesson title must not be null").trim();
        this.slug = slug != null ? slug.trim() : null;
        this.description = description != null ? description.trim() : null;
        this.content = content;
        this.lessonType = lessonType != null ? lessonType : LessonType.TEXT;
        this.position = Objects.requireNonNull(position, "Lesson position must not be null");
        this.durationSeconds = (durationSeconds != null && durationSeconds >= 0) ? durationSeconds : 0;
        this.isPreview = isPreview;
        this.mediaKey = mediaKey != null ? mediaKey.trim() : null;
        this.status = status != null ? status : LessonStatus.DRAFT;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public static Lesson create(
            UUID sectionId,
            String title,
            String slug,
            String description,
            String content,
            LessonType lessonType,
            int position,
            Integer durationSeconds,
            boolean isPreview,
            String mediaKey
    ) {
        return new Lesson(
                UUID.randomUUID(),
                sectionId,
                title,
                slug,
                description,
                content,
                lessonType,
                position,
                durationSeconds,
                isPreview,
                mediaKey,
                LessonStatus.DRAFT
        );
    }

    public void update(
            String title,
            String slug,
            String description,
            String content,
            LessonType lessonType,
            Integer durationSeconds,
            boolean isPreview,
            String mediaKey,
            LessonStatus status
    ) {
        this.title = Objects.requireNonNull(title, "Lesson title must not be null").trim();
        this.slug = slug != null ? slug.trim() : null;
        this.description = description != null ? description.trim() : null;
        this.content = content;
        if (lessonType != null) {
            this.lessonType = lessonType;
        }
        this.durationSeconds = (durationSeconds != null && durationSeconds >= 0) ? durationSeconds : 0;
        this.isPreview = isPreview;
        this.mediaKey = mediaKey != null ? mediaKey.trim() : null;
        if (status != null) {
            this.status = status;
        }
        this.updatedAt = Instant.now();
    }

    public void updatePosition(int newPosition) {
        if (newPosition < 1) {
            throw new IllegalArgumentException("Position must be greater than or equal to 1");
        }
        this.position = newPosition;
        this.updatedAt = Instant.now();
    }

    public void publish() {
        this.status = LessonStatus.PUBLISHED;
        this.updatedAt = Instant.now();
    }

    public void archive() {
        this.status = LessonStatus.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getSectionId() {
        return sectionId;
    }

    public String getTitle() {
        return title;
    }

    public String getSlug() {
        return slug;
    }

    public String getDescription() {
        return description;
    }

    public String getContent() {
        return content;
    }

    public LessonType getLessonType() {
        return lessonType;
    }

    public Integer getPosition() {
        return position;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public boolean isPreview() {
        return isPreview;
    }

    public String getMediaKey() {
        return mediaKey;
    }

    public LessonStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
