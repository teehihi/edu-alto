package com.edualto.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt {
    @Id
    private UUID id;

    @Column(name = "quiz_id", nullable = false)
    private UUID quizId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "score", nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "correct_answers", nullable = false)
    private int correctAnswers;

    @Column(name = "total_questions", nullable = false)
    private int totalQuestions;

    @Column(name = "passed", nullable = false)
    private boolean passed;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    protected QuizAttempt() {
    }

    public QuizAttempt(UUID quizId, UUID studentId, BigDecimal score, int correctAnswers, int totalQuestions, boolean passed) {
        this.id = UUID.randomUUID();
        this.quizId = quizId;
        this.studentId = studentId;
        this.score = score;
        this.correctAnswers = correctAnswers;
        this.totalQuestions = totalQuestions;
        this.passed = passed;
        this.submittedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getQuizId() { return quizId; }
    public UUID getStudentId() { return studentId; }
    public BigDecimal getScore() { return score; }
    public int getCorrectAnswers() { return correctAnswers; }
    public int getTotalQuestions() { return totalQuestions; }
    public boolean isPassed() { return passed; }
    public Instant getSubmittedAt() { return submittedAt; }
}
