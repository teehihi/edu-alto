package com.edualto.discussion.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "discussion_comments")
public class DiscussionComment {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID discussionId;

    @Column(nullable = false)
    private UUID authorId;

    @Column
    private UUID parentCommentId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Column
    private Instant deletedAt;

    protected DiscussionComment() {
    }

    public DiscussionComment(UUID id, UUID discussionId, UUID authorId, UUID parentCommentId, String body) {
        this.id = id;
        this.discussionId = discussionId;
        this.authorId = authorId;
        this.parentCommentId = parentCommentId;
        this.body = body;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getDiscussionId() {
        return discussionId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public UUID getParentCommentId() {
        return parentCommentId;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void markDeleted() {
        this.deletedAt = Instant.now();
    }
}
