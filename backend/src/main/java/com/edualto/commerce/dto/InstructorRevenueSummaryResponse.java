package com.edualto.commerce.dto;

import java.math.BigDecimal;
import java.util.List;

public record InstructorRevenueSummaryResponse(
        BigDecimal paidNetAmount,
        long paidTransactionCount,
        long pendingTransactionCount,
        List<Period> periods
) {
    public record Period(String label, BigDecimal netAmount, BigDecimal previousNetAmount) {
    }
}
