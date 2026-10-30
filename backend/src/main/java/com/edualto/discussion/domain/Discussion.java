package com.edualto.discussion.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "discussions")
public class Discussion {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID courseId;

    @Column(nullable = false)
    private UUID lessonId;

    @Column(nullable = false)
    private UUID authorId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column
    private Integer videoTimestampSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DiscussionStatus status;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Column
    private Instant deletedAt;

    protected Discussion() {
    }

    public Discussion(UUID id, UUID courseId, UUID lessonId, UUID authorId, String title, String body, Integer videoTimestampSeconds) {
        this.id = id;
        this.courseId = courseId;
        this.lessonId = lessonId;
        this.authorId = authorId;
        this.title = title;
        this.body = body;
        this.videoTimestampSeconds = videoTimestampSeconds;
        this.status = DiscussionStatus.OPEN;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
        if (status == null) {
            status = DiscussionStatus.OPEN;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCourseId() {
        return courseId;
    }

    public UUID getLessonId() {
        return lessonId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Integer getVideoTimestampSeconds() {
        return videoTimestampSeconds;
    }

    public void setVideoTimestampSeconds(Integer videoTimestampSeconds) {
        this.videoTimestampSeconds = videoTimestampSeconds;
    }

    public DiscussionStatus getStatus() {
        return status;
    }

    public void setStatus(DiscussionStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void markDeleted() {
        this.deletedAt = Instant.now();
    }
}
