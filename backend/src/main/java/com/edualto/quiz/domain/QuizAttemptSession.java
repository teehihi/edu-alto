package com.edualto.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quiz_attempt_sessions")
public class QuizAttemptSession {
    @Id
    private UUID id;

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuizAttemptSessionStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "attempt_id")
    private UUID attemptId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected QuizAttemptSession() {
    }

    public QuizAttemptSession(UUID quizId, UUID studentId, Instant startedAt, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.quizId = quizId;
        this.studentId = studentId;
        this.status = QuizAttemptSessionStatus.IN_PROGRESS;
        this.startedAt = startedAt;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; }
    public UUID getStudentId() { return studentId; }
    public QuizAttemptSessionStatus getStatus() { return status; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public UUID getAttemptId() { return attemptId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void markSubmitted(UUID submittedAttemptId) {
        this.status = QuizAttemptSessionStatus.SUBMITTED;
        this.attemptId = submittedAttemptId;
        this.updatedAt = Instant.now();
    }

    public void markExpired() {
        this.status = QuizAttemptSessionStatus.EXPIRED;
        this.updatedAt = Instant.now();
    }
}
