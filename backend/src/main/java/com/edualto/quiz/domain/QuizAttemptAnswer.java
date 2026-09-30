package com.edualto.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "quiz_attempt_answers")
public class QuizAttemptAnswer {
    @Id
    private UUID id;

    @Column(name = "attempt_id", nullable = false)
    private UUID attemptId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "selected_option_id", nullable = false)
    private UUID selectedOptionId;

    @Column(name = "is_correct", nullable = false)
    private boolean correct;

    protected QuizAttemptAnswer() {
    }

    public QuizAttemptAnswer(UUID attemptId, UUID questionId, UUID selectedOptionId, boolean correct) {
        this.id = UUID.randomUUID();
        this.attemptId = attemptId;
        this.questionId = questionId;
        this.selectedOptionId = selectedOptionId;
        this.correct = correct;
    }
}
