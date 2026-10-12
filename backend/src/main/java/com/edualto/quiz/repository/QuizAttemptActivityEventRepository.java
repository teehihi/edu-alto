package com.edualto.quiz.repository;

import com.edualto.quiz.domain.QuizAttemptActivityEvent;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptActivityEventRepository extends JpaRepository<QuizAttemptActivityEvent, UUID> {
}
