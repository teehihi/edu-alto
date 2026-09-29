package com.edualto.assignment.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SubmissionResponse(
        UUID id,
        UUID assignmentId,
        UUID studentId,
        String studentName,
        String studentEmail,
        String responseText,
        Instant submittedAt,
        BigDecimal score,
        String feedback,
        Instant gradedAt
) { }
