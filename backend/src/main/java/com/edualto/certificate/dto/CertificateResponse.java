package com.edualto.certificate.dto;

import java.time.Instant;
import java.util.UUID;

public record CertificateResponse(
        UUID id,
        String certificateNumber,
        UUID courseId,
        String courseTitle,
        String studentName,
        String instructorName,
        Instant issuedAt
) {
}
