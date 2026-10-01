package com.edualto.commerce.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record InstructorRevenueTransactionResponse(
        UUID orderId,
        UUID courseId,
        String courseTitle,
        String studentName,
        BigDecimal amount,
        String status,
        String paymentMethod,
        OffsetDateTime createdAt
) {
}
