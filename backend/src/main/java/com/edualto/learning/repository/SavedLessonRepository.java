package com.edualto.learning.repository;

import com.edualto.learning.domain.SavedLesson;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SavedLessonRepository extends JpaRepository<SavedLesson, UUID> {
    interface SavedLessonRow {
        UUID getId();

        UUID getLessonId();

        UUID getCourseId();

        String getCourseSlug();

        String getCourseTitle();

        String getSectionTitle();

        String getLessonTitle();

        String getLessonType();

        Integer getDurationSeconds();

        Instant getSavedAt();
    }

    @Modifying
    @Query(value = """
            insert into saved_lessons (id, user_id, lesson_id, created_at)
            values (:id, :userId, :lessonId, current_timestamp)
            on conflict (user_id, lesson_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id, @Param("userId") UUID userId, @Param("lessonId") UUID lessonId);

    @Query(value = """
            select saved.id as id, lesson.id as "lessonId", course.id as "courseId", course.slug as "courseSlug",
                   course.title as "courseTitle", section.title as "sectionTitle", lesson.title as "lessonTitle",
                   lesson.lesson_type as "lessonType", lesson.duration_seconds as "durationSeconds",
                   saved.created_at as "savedAt"
            from saved_lessons saved
            join lessons lesson on lesson.id = saved.lesson_id
            join sections section on section.id = lesson.section_id
            join courses course on course.id = section.course_id
            where saved.user_id = :userId
            order by saved.created_at desc, saved.id asc
            """, countQuery = "select count(*) from saved_lessons where user_id = :userId", nativeQuery = true)
    Page<SavedLessonRow> findAllResponsesByUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query(value = """
            select saved.id as id, lesson.id as "lessonId", course.id as "courseId", course.slug as "courseSlug",
                   course.title as "courseTitle", section.title as "sectionTitle", lesson.title as "lessonTitle",
                   lesson.lesson_type as "lessonType", lesson.duration_seconds as "durationSeconds",
                   saved.created_at as "savedAt"
            from saved_lessons saved
            join lessons lesson on lesson.id = saved.lesson_id
            join sections section on section.id = lesson.section_id
            join courses course on course.id = section.course_id
            where saved.user_id = :userId and saved.lesson_id = :lessonId
            """, nativeQuery = true)
    Optional<SavedLessonRow> findResponseByUserIdAndLessonId(
            @Param("userId") UUID userId, @Param("lessonId") UUID lessonId);

    @Modifying
    @Query("delete from SavedLesson saved where saved.userId = :userId and saved.lessonId = :lessonId")
    int deleteByUserIdAndLessonId(@Param("userId") UUID userId, @Param("lessonId") UUID lessonId);
}
