package com.edualto.commerce.dto;

import java.math.BigDecimal;
import java.util.List;

public record PromotionSummaryResponse(long totalPromotionCount, long redeemedCount, BigDecimal redeemedAmount,
                                       List<Period> periods) {
    public record Period(String label, long redeemedCount, BigDecimal redeemedAmount) { }
}
