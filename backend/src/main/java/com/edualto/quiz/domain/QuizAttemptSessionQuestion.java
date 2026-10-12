package com.edualto.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "quiz_attempt_session_questions")
public class QuizAttemptSessionQuestion {
    @Id
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(nullable = false)
    private int position;

    protected QuizAttemptSessionQuestion() {
    }

    public QuizAttemptSessionQuestion(UUID sessionId, UUID questionId, int position) {
        this.id = UUID.randomUUID();
        this.sessionId = sessionId;
        this.questionId = questionId;
        this.position = position;
    }

    public UUID getId() { return id; }
    public UUID getSessionId() { return sessionId; }
    public UUID getQuestionId() { return questionId; }
    public int getPosition() { return position; }
}
