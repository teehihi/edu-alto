package com.edualto.learning.repository;

import com.edualto.learning.domain.LearningNote;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LearningNoteRepository extends JpaRepository<LearningNote, UUID> {
    Page<LearningNote> findAllByUserId(UUID userId, Pageable pageable);

    Optional<LearningNote> findByIdAndUserId(UUID id, UUID userId);
}
