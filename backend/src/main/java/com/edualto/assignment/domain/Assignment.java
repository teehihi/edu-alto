package com.edualto.assignment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assignments")
public class Assignment {
    @Id
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "instructor_id", nullable = false)
    private UUID instructorId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "max_score", nullable = false, precision = 8, scale = 2)
    private BigDecimal maxScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private AssignmentStatus status = AssignmentStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    protected Assignment() { }

    public Assignment(UUID courseId, UUID instructorId, String title, String description, Instant dueAt, BigDecimal maxScore) {
        this.id = UUID.randomUUID();
        this.courseId = courseId;
        this.instructorId = instructorId;
        update(title, description, dueAt, maxScore);
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public void update(String title, String description, Instant dueAt, BigDecimal maxScore) {
        this.title = title.trim();
        this.description = description.trim();
        this.dueAt = dueAt;
        this.maxScore = maxScore;
    }

    public void publish() {
        status = AssignmentStatus.PUBLISHED;
        if (publishedAt == null) publishedAt = Instant.now();
    }

    public void archive() { status = AssignmentStatus.ARCHIVED; }
    public UUID getId() { return id; }
    public UUID getCourseId() { return courseId; }
    public UUID getInstructorId() { return instructorId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Instant getDueAt() { return dueAt; }
    public BigDecimal getMaxScore() { return maxScore; }
    public AssignmentStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getPublishedAt() { return publishedAt; }
}
