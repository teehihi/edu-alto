package com.edualto.commerce.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(UUID orderId, String status, String currency, BigDecimal subtotal,
                            BigDecimal discountTotal, BigDecimal total,
                            OffsetDateTime createdAt, OffsetDateTime expiresAt, String paymentReviewReason,
                            List<OrderItemResponse> items) {
    public record OrderItemResponse(UUID courseId, String title, BigDecimal unitPrice, BigDecimal listPrice,
                                    BigDecimal discountAmount, String promotionCode) {
    }
}
