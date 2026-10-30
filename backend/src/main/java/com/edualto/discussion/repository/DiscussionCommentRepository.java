package com.edualto.discussion.repository;

import com.edualto.discussion.domain.DiscussionComment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscussionCommentRepository extends JpaRepository<DiscussionComment, UUID> {

    Optional<DiscussionComment> findByIdAndDeletedAtIsNull(UUID id);

    List<DiscussionComment> findByDiscussionIdAndDeletedAtIsNullOrderByCreatedAtAsc(UUID discussionId);

    long countByDiscussionIdAndDeletedAtIsNull(UUID discussionId);

    @Query("""
            select c.discussionId as discussionId, count(c.id) as count
            from DiscussionComment c
            where c.discussionId in :discussionIds and c.deletedAt is null
            group by c.discussionId
            """)
    List<DiscussionCommentCountProjection> countByDiscussionIdIn(
            @Param("discussionIds") Collection<UUID> discussionIds
    );
}
