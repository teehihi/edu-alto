package com.edualto.ai.domain;

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
@Table(name = "curriculum_import_jobs")
public class CurriculumImportJob {

    public enum Status { QUEUED, PROCESSING, COMPLETED, FAILED, APPLIED }

    @Id
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "instructor_id", nullable = false)
    private UUID instructorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "preview_json", columnDefinition = "TEXT")
    private String previewJson;

    @Column(length = 1000)
    private String message;

    @Column(name = "chapter_count")
    private Integer chapterCount;

    @Column(name = "lesson_count")
    private Integer lessonCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CurriculumImportJob() { }

    public CurriculumImportJob(UUID courseId, UUID instructorId) {
        this.id = UUID.randomUUID();
        this.courseId = courseId;
        this.instructorId = instructorId;
        this.status = Status.QUEUED;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public void start() {
        status = Status.PROCESSING;
        message = null;
    }

    public void complete(String json) {
        previewJson = json;
        message = null;
        status = Status.COMPLETED;
    }

    public void fail(String explanation) {
        message = explanation;
        status = Status.FAILED;
    }

    public void apply(int chapters, int lessons) {
        chapterCount = chapters;
        lessonCount = lessons;
        status = Status.APPLIED;
    }

    public UUID getId() { return id; }
    public UUID getCourseId() { return courseId; }
    public UUID getInstructorId() { return instructorId; }
    public Status getStatus() { return status; }
    public String getPreviewJson() { return previewJson; }
    public String getMessage() { return message; }
    public Integer getChapterCount() { return chapterCount; }
    public Integer getLessonCount() { return lessonCount; }
}
