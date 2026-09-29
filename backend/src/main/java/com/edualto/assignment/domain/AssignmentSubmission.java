package com.edualto.assignment.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assignment_submissions")
public class AssignmentSubmission {
    @Id
    private UUID id;

    @Column(name = "assignment_id", nullable = false)
    private UUID assignmentId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "response_text", nullable = false, columnDefinition = "TEXT")
    private String responseText;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(precision = 8, scale = 2)
    private BigDecimal score;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "graded_by")
    private UUID gradedBy;

    @Column(name = "graded_at")
    private Instant gradedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AssignmentSubmission() { }

    public AssignmentSubmission(UUID assignmentId, UUID studentId, String responseText) {
        this.id = UUID.randomUUID();
        this.assignmentId = assignmentId;
        this.studentId = studentId;
        this.responseText = responseText.trim();
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = now;
        if (submittedAt == null) submittedAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = Instant.now(); }

    public void updateResponse(String text) {
        responseText = text.trim();
        submittedAt = Instant.now();
        score = null;
        feedback = null;
        gradedBy = null;
        gradedAt = null;
    }

    public void grade(BigDecimal score, String feedback, UUID instructorId) {
        this.score = score;
        this.feedback = feedback;
        this.gradedBy = instructorId;
        this.gradedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getAssignmentId() { return assignmentId; }
    public UUID getStudentId() { return studentId; }
    public String getResponseText() { return responseText; }
    public Instant getSubmittedAt() { return submittedAt; }
    public BigDecimal getScore() { return score; }
    public String getFeedback() { return feedback; }
    public UUID getGradedBy() { return gradedBy; }
    public Instant getGradedAt() { return gradedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
