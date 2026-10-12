package com.edualto.quiz.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quizzes")
public class Quiz {
    @Id
    private UUID id;

    @Column(name = "lesson_id", nullable = false, unique = true)
    private UUID lessonId;

    @Column(name = "passing_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal passingScore;

    @Column(name = "questions_per_attempt", nullable = false)
    private int questionsPerAttempt;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<QuizQuestion> questions = new ArrayList<>();

    protected Quiz() {
    }

    public Quiz(UUID lessonId, BigDecimal passingScore, int questionsPerAttempt, int durationMinutes,
            List<QuizQuestion> questions) {
        this.id = UUID.randomUUID();
        this.lessonId = lessonId;
        this.passingScore = passingScore;
        this.questionsPerAttempt = questionsPerAttempt;
        this.durationMinutes = durationMinutes;
        this.createdAt = Instant.now();
        this.questions = new ArrayList<>(questions);
        this.questions.forEach(question -> question.setQuiz(this));
    }

    public UUID getId() { return id; }
    public UUID getLessonId() { return lessonId; }
    public BigDecimal getPassingScore() { return passingScore; }
    public int getQuestionsPerAttempt() { return questionsPerAttempt; }
    public int getDurationMinutes() { return durationMinutes; }
    public Instant getCreatedAt() { return createdAt; }
    public List<QuizQuestion> getQuestions() { return questions; }

    public void replaceContent(BigDecimal passingScore, int questionsPerAttempt, int durationMinutes,
            List<QuizQuestion> replacement) {
        this.passingScore = passingScore;
        this.questionsPerAttempt = questionsPerAttempt;
        this.durationMinutes = durationMinutes;
        this.questions.clear();
        replacement.forEach(question -> {
            question.setQuiz(this);
            this.questions.add(question);
        });
    }
}
