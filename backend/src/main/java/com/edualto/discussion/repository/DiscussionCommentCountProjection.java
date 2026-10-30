package com.edualto.discussion.repository;

import java.util.UUID;

public interface DiscussionCommentCountProjection {

    UUID getDiscussionId();

    long getCount();
}
