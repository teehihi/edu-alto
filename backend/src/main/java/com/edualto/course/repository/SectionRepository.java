package com.edualto.course.repository;

import com.edualto.course.domain.Section;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SectionRepository extends JpaRepository<Section, UUID> {

    List<Section> findAllByCourseIdOrderByPositionAsc(UUID courseId);

    Optional<Section> findByIdAndCourseId(UUID id, UUID courseId);

    Optional<Section> findTopByCourseIdOrderByPositionDesc(UUID courseId);

    int countByCourseId(UUID courseId);

    boolean existsByCourseIdAndId(UUID courseId, UUID id);

    void deleteAllByCourseId(UUID courseId);
}
