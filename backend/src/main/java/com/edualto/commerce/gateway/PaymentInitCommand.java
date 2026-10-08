package com.edualto.commerce.gateway;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record PaymentInitCommand(
        UUID orderId,
        UUID studentId,
        BigDecimal total,
        long amountMinorUnits,
        String clientIp,
        String transferReference,
        OffsetDateTime expiresAt,
        List<ItemInfo> items
) {
    public record ItemInfo(UUID courseId, String title, BigDecimal price) {
    }
}
