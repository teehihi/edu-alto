package com.edualto.commerce.dto;

import java.math.BigDecimal;
import java.util.List;

public record InstructorCourseRevenueResponse(
        BigDecimal paidNetAmount,
        long paidTransactionCount,
        long pendingTransactionCount,
        List<InstructorRevenueSummaryResponse.Period> periods
) {
}
