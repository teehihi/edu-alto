package com.edualto.quiz.repository;

import com.edualto.quiz.domain.QuizAttemptAnswer;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptAnswerRepository extends JpaRepository<QuizAttemptAnswer, UUID> {
}
