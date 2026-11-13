package com.edualto.analytics.dto;

import java.time.Instant;

public record AdminMlRetrainResponse(
        String status,
        String message,
        Instant startedAt
) {
}
