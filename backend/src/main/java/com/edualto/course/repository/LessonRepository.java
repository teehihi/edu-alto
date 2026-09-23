package com.edualto.course.repository;

import com.edualto.course.domain.Lesson;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    List<Lesson> findAllBySectionIdOrderByPositionAsc(UUID sectionId);

    List<Lesson> findAllBySectionIdInOrderByPositionAsc(Collection<UUID> sectionIds);

    Optional<Lesson> findByIdAndSectionId(UUID id, UUID sectionId);

    Optional<Lesson> findTopBySectionIdOrderByPositionDesc(UUID sectionId);

    int countBySectionId(UUID sectionId);

    boolean existsBySectionIdAndId(UUID sectionId, UUID id);

    void deleteAllBySectionId(UUID sectionId);

    void deleteAllBySectionIdIn(Collection<UUID> sectionIds);
}
