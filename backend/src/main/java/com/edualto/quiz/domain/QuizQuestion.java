package com.edualto.quiz.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quiz_questions")
public class QuizQuestion {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(name = "prompt", nullable = false, columnDefinition = "text")
    private String prompt;

    @Column(name = "position", nullable = false)
    private int position;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<QuizOption> options = new ArrayList<>();

    protected QuizQuestion() {
    }

    public QuizQuestion(String prompt, int position, List<QuizOption> options) {
        this.id = UUID.randomUUID();
        this.prompt = prompt;
        this.position = position;
        this.options = new ArrayList<>(options);
        this.options.forEach(option -> option.setQuestion(this));
    }

    void setQuiz(Quiz quiz) { this.quiz = quiz; }
    public UUID getId() { return id; }
    public String getPrompt() { return prompt; }
    public int getPosition() { return position; }
    public List<QuizOption> getOptions() { return options; }
}
