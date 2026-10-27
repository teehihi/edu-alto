package com.edualto.certificate.dto;

import java.time.Instant;
import java.util.UUID;

public record CertificateVerificationResponse(
        String certificateNumber,
        UUID courseId,
        String courseTitle,
        String studentName,
        String instructorName,
        Instant issuedAt,
        boolean isValid,
        String verificationUrl,
        String qrCodeDataUrl
) {
}
