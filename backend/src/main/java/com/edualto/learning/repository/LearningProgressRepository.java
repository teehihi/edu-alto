package com.edualto.learning.repository;

import com.edualto.learning.domain.LearningProgress;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearningProgressRepository extends JpaRepository<LearningProgress, UUID> {
    @Modifying
    @Query(value = """
            insert into learning_progress (id, enrollment_id, course_id, section_id, lesson_id, completed_at, created_at, updated_at)
            values (:id, :enrollmentId, :courseId, :sectionId, :lessonId, current_timestamp, current_timestamp, current_timestamp)
            on conflict (enrollment_id, lesson_id) do nothing
            """, nativeQuery = true)
    int completeIfAbsent(@Param("id") UUID id, @Param("enrollmentId") UUID enrollmentId,
                         @Param("courseId") UUID courseId, @Param("sectionId") UUID sectionId, @Param("lessonId") UUID lessonId);

    interface ProgressCounts {
        long getTotalLessons();
        long getCompletedLessons();
    }

    @Query(value = """
            select count(l.id) as "totalLessons", count(p.id) as "completedLessons"
            from lessons l join sections s on s.id = l.section_id
            left join learning_progress p on p.lesson_id = l.id and p.enrollment_id = :enrollmentId
            where s.course_id = :courseId and l.status = 'PUBLISHED'
              and l.lesson_type in ('TEXT', 'VIDEO', 'QUIZ')
            """, nativeQuery = true)
    ProgressCounts countProgress(@Param("enrollmentId") UUID enrollmentId, @Param("courseId") UUID courseId);
}
