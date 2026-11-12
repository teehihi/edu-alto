package com.edualto.learning.repository;

import com.edualto.learning.domain.LearningProgress;
import java.util.List;
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

    @Query("""
            select p.lessonId
            from LearningProgress p
            where p.enrollmentId = :enrollmentId and p.courseId = :courseId
            """)
    List<UUID> findCompletedLessonIds(@Param("enrollmentId") UUID enrollmentId,
                                      @Param("courseId") UUID courseId);

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

    interface CourseProgressSummaryProjection {
        UUID getCourseId();
        long getTotalLessons();
        long getCompletedLessons();
    }

    @Query(value = """
            select c.id as "courseId",
                   count(l.id) as "totalLessons",
                   count(p.id) as "completedLessons"
            from enrollments e
            join courses c on c.id = e.course_id
            left join sections s on s.course_id = c.id
            left join lessons l on l.section_id = s.id
                and l.status = 'PUBLISHED'
                and l.lesson_type in ('TEXT', 'VIDEO', 'QUIZ')
            left join learning_progress p on p.lesson_id = l.id and p.enrollment_id = e.id
            where e.student_id = :studentId
              and e.status = 'ACTIVE'
              and c.status = 'PUBLISHED'
            group by c.id, e.enrolled_at
            order by e.enrolled_at desc, c.id asc
            """, nativeQuery = true)
    List<CourseProgressSummaryProjection> findBatchProgressSummary(@Param("studentId") UUID studentId);
}
