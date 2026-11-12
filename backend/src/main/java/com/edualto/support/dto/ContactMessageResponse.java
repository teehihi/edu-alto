package com.edualto.support.dto;

import com.edualto.support.domain.ContactMessageStatus;
import java.time.Instant;
import java.util.UUID;

public record ContactMessageResponse(
        UUID id,
        ContactMessageStatus status,
        Instant createdAt
) {
}
