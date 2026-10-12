package com.edualto.quiz.repository;

import com.edualto.quiz.domain.QuizAttemptSessionQuestion;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptSessionQuestionRepository extends JpaRepository<QuizAttemptSessionQuestion, UUID> {
    List<QuizAttemptSessionQuestion> findBySessionIdOrderByPositionAsc(UUID sessionId);
}
