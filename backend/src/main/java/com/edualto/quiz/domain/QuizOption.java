package com.edualto.quiz.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "quiz_options")
public class QuizOption {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private QuizQuestion question;

    @Column(name = "label", nullable = false, columnDefinition = "text")
    private String label;

    @Column(name = "is_correct", nullable = false)
    private boolean correct;

    @Column(name = "position", nullable = false)
    private int position;

    protected QuizOption() {
    }

    public QuizOption(String label, boolean correct, int position) {
        this.id = UUID.randomUUID();
        this.label = label;
        this.correct = correct;
        this.position = position;
    }

    void setQuestion(QuizQuestion question) { this.question = question; }
    public UUID getId() { return id; }
    public String getLabel() { return label; }
    public boolean isCorrect() { return correct; }
    public int getPosition() { return position; }
}
