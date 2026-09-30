package com.edualto.quiz.repository;

import com.edualto.quiz.domain.QuizAttempt;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {
}
