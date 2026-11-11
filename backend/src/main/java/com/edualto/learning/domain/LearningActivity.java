package com.edualto.learning.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "learning_activities")
public class LearningActivity {

    @Id
    private UUID id;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "section_id")
    private UUID sectionId;

    @Column(name = "lesson_id")
    private UUID lessonId;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", nullable = false, length = 50)
    private LearningActivityType activityType;

    @Column(name = "source_id")
    private UUID sourceId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "metadata", columnDefinition = "jsonb")
    @ColumnTransformer(write = "CAST(? AS jsonb)")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected LearningActivity() {
    }

    public LearningActivity(
            UUID studentId,
            UUID courseId,
            UUID sectionId,
            UUID lessonId,
            LearningActivityType activityType,
            Instant occurredAt,
            String metadata
    ) {
        this.id = UUID.randomUUID();
        this.studentId = Objects.requireNonNull(studentId, "studentId must not be null");
        this.courseId = Objects.requireNonNull(courseId, "courseId must not be null");
        this.sectionId = sectionId;
        this.lessonId = lessonId;
        this.activityType = Objects.requireNonNull(activityType, "activityType must not be null");
        this.occurredAt = occurredAt != null ? occurredAt : Instant.now();
        this.metadata = metadata;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public LearningActivity(
            UUID studentId,
            UUID courseId,
            UUID sectionId,
            UUID lessonId,
            LearningActivityType activityType,
            UUID sourceId,
            Instant occurredAt,
            String metadata
    ) {
        this(studentId, courseId, sectionId, lessonId, activityType, occurredAt, metadata);
        this.sourceId = sourceId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public UUID getCourseId() {
        return courseId;
    }

    public UUID getSectionId() {
        return sectionId;
    }

    public UUID getLessonId() {
        return lessonId;
    }

    public LearningActivityType getActivityType() {
        return activityType;
    }

    public UUID getSourceId() {
        return sourceId;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getMetadata() {
        return metadata;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
