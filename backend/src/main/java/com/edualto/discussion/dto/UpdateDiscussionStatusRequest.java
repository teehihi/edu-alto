package com.edualto.discussion.dto;

import com.edualto.discussion.domain.DiscussionStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateDiscussionStatusRequest(
        @NotNull(message = "Trạng thái không được để trống")
        DiscussionStatus status
) {
}
