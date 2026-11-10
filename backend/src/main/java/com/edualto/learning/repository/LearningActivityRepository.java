package com.edualto.learning.repository;

import com.edualto.learning.domain.LearningActivity;
import com.edualto.learning.domain.LearningActivityType;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearningActivityRepository extends JpaRepository<LearningActivity, UUID> {

    Page<LearningActivity> findByStudentIdOrderByOccurredAtDesc(UUID studentId, Pageable pageable);

    Page<LearningActivity> findByStudentIdAndCourseIdOrderByOccurredAtDesc(UUID studentId, UUID courseId, Pageable pageable);

    Page<LearningActivity> findByStudentIdAndOccurredAtBetweenOrderByOccurredAtDesc(
            UUID studentId,
            Instant from,
            Instant to,
            Pageable pageable
    );

    Page<LearningActivity> findByStudentIdAndCourseIdAndOccurredAtBetweenOrderByOccurredAtDesc(
            UUID studentId,
            UUID courseId,
            Instant from,
            Instant to,
            Pageable pageable
    );

    Page<LearningActivity> findByCourseIdOrderByOccurredAtDesc(UUID courseId, Pageable pageable);

    Page<LearningActivity> findByCourseIdAndOccurredAtBetweenOrderByOccurredAtDesc(
            UUID courseId,
            Instant from,
            Instant to,
            Pageable pageable
    );

    Page<LearningActivity> findByCourseIdAndActivityTypeAndOccurredAtBetweenOrderByOccurredAtDesc(
            UUID courseId,
            LearningActivityType activityType,
            Instant from,
            Instant to,
            Pageable pageable
    );

    boolean existsBySourceIdAndActivityType(UUID sourceId, LearningActivityType activityType);

    long countByStudentId(UUID studentId);

    long countByCourseId(UUID courseId);

    long countByCourseIdAndActivityType(UUID courseId, LearningActivityType activityType);

    long countByCourseIdAndOccurredAtBetween(UUID courseId, Instant from, Instant to);

    @Query("SELECT COUNT(DISTINCT a.studentId) FROM LearningActivity a WHERE a.courseId = :courseId AND a.occurredAt BETWEEN :from AND :to")
    long countDistinctActiveStudentsByCourseAndTimeRange(
            @Param("courseId") UUID courseId,
            @Param("from") Instant from,
            @Param("to") Instant to
    );
}
