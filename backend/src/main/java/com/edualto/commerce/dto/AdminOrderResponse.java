package com.edualto.commerce.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminOrderResponse(UUID orderId, String status, String paymentMethod, String transferReference,
                                 UUID studentId, String studentName, BigDecimal total, String currency,
                                 OffsetDateTime createdAt) {
}
