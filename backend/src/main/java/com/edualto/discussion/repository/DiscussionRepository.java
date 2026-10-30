package com.edualto.discussion.repository;

import com.edualto.discussion.domain.Discussion;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscussionRepository extends JpaRepository<Discussion, UUID> {

    Optional<Discussion> findByIdAndDeletedAtIsNull(UUID id);

    @Query("""
            select d from Discussion d
            where d.lessonId = :lessonId and d.deletedAt is null
              and (:onlyWithTimestamp = false or d.videoTimestampSeconds is not null)
              and (:query is null or lower(d.title) like lower(concat('%', :query, '%')) or lower(d.body) like lower(concat('%', :query, '%')))
            order by
              case when :sort = 'timestamp' then d.videoTimestampSeconds end asc nulls last,
              case when :sort = 'oldest' then d.createdAt end asc,
              d.createdAt desc
            """)
    Page<Discussion> searchLessonDiscussions(
            @Param("lessonId") UUID lessonId,
            @Param("onlyWithTimestamp") boolean onlyWithTimestamp,
            @Param("query") String query,
            @Param("sort") String sort,
            Pageable pageable
    );

    @Query("""
            select d from Discussion d
            where d.courseId = :courseId and d.deletedAt is null
            order by d.createdAt desc
            """)
    Page<Discussion> findByCourseIdAndDeletedAtIsNull(
            @Param("courseId") UUID courseId,
            Pageable pageable
    );

    long countByLessonIdAndDeletedAtIsNull(UUID lessonId);

    long countByLessonIdAndVideoTimestampSecondsIsNotNullAndDeletedAtIsNull(UUID lessonId);
}
