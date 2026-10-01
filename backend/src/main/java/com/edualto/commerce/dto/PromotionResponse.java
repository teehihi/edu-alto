package com.edualto.commerce.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PromotionResponse(UUID id, UUID courseId, String name, String code, String discountType,
                                BigDecimal discountValue, Integer maxRedemptions, long redeemedCount,
                                BigDecimal redeemedAmount, OffsetDateTime startsAt, OffsetDateTime endsAt,
                                String status) {
}
