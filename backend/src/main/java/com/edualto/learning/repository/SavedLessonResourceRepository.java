package com.edualto.learning.repository;

import com.edualto.learning.domain.SavedLessonResource;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SavedLessonResourceRepository extends JpaRepository<SavedLessonResource, UUID> {
    interface SavedLessonResourceRow {
        UUID getId();

        UUID getAttachmentId();

        UUID getLessonId();

        UUID getCourseId();

        String getCourseSlug();

        String getCourseTitle();

        String getSectionTitle();

        String getLessonTitle();

        String getFileName();

        String getContentType();

        Long getContentLength();

        Instant getSavedAt();
    }

    interface PublishedLessonResourceRow {
        UUID getCourseId();
    }

    @Modifying
    @Query(value = """
            insert into saved_lesson_resources (id, user_id, attachment_id, created_at)
            values (:id, :userId, :attachmentId, current_timestamp)
            on conflict (user_id, attachment_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id, @Param("userId") UUID userId,
                       @Param("attachmentId") UUID attachmentId);

    @Query(value = """
            select saved.id as id, attachment.id as "attachmentId", lesson.id as "lessonId",
                   course.id as "courseId", course.slug as "courseSlug", course.title as "courseTitle",
                   section.title as "sectionTitle", lesson.title as "lessonTitle",
                   attachment.file_name as "fileName", attachment.content_type as "contentType",
                   attachment.content_length as "contentLength", saved.created_at as "savedAt"
            from saved_lesson_resources saved
            join lesson_attachments attachment on attachment.id = saved.attachment_id
            join lessons lesson on lesson.id = attachment.lesson_id
            join sections section on section.id = lesson.section_id
            join courses course on course.id = section.course_id
            where saved.user_id = :userId and (:courseId is null or course.id = :courseId)
            order by saved.created_at desc, saved.id asc
            """, countQuery = """
            select count(*)
            from saved_lesson_resources saved
            join lesson_attachments attachment on attachment.id = saved.attachment_id
            join lessons lesson on lesson.id = attachment.lesson_id
            join sections section on section.id = lesson.section_id
            join courses course on course.id = section.course_id
            where saved.user_id = :userId and (:courseId is null or course.id = :courseId)
            """, nativeQuery = true)
    Page<SavedLessonResourceRow> findAllResponsesByUserId(
            @Param("userId") UUID userId, @Param("courseId") UUID courseId, Pageable pageable);

    @Query(value = """
            select saved.id as id, attachment.id as "attachmentId", lesson.id as "lessonId",
                   course.id as "courseId", course.slug as "courseSlug", course.title as "courseTitle",
                   section.title as "sectionTitle", lesson.title as "lessonTitle",
                   attachment.file_name as "fileName", attachment.content_type as "contentType",
                   attachment.content_length as "contentLength", saved.created_at as "savedAt"
            from saved_lesson_resources saved
            join lesson_attachments attachment on attachment.id = saved.attachment_id
            join lessons lesson on lesson.id = attachment.lesson_id
            join sections section on section.id = lesson.section_id
            join courses course on course.id = section.course_id
            where saved.user_id = :userId and saved.attachment_id = :attachmentId
            """, nativeQuery = true)
    Optional<SavedLessonResourceRow> findResponseByUserIdAndAttachmentId(
            @Param("userId") UUID userId, @Param("attachmentId") UUID attachmentId);

    @Query(value = """
            select course.id as "courseId"
            from lesson_attachments attachment
            join lessons lesson on lesson.id = attachment.lesson_id
            join sections section on section.id = lesson.section_id
            join courses course on course.id = section.course_id
            where attachment.id = :attachmentId and lesson.status = 'PUBLISHED' and course.status = 'PUBLISHED'
            """, nativeQuery = true)
    Optional<PublishedLessonResourceRow> findPublishedLessonByAttachmentId(
            @Param("attachmentId") UUID attachmentId);

    @Modifying
    @Query("delete from SavedLessonResource saved where saved.userId = :userId and saved.attachmentId = :attachmentId")
    int deleteByUserIdAndAttachmentId(@Param("userId") UUID userId,
                                      @Param("attachmentId") UUID attachmentId);
}
