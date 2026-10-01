package com.edualto.certificate.domain;

import java.time.Instant;
import java.util.UUID;

public record Certificate(
        UUID id,
        String certificateNumber,
        UUID courseId,
        String courseTitle,
        String studentName,
        String instructorName,
        Instant issuedAt
) {
}
