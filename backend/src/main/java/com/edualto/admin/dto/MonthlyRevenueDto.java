package com.edualto.admin.dto;

import java.math.BigDecimal;

public record MonthlyRevenueDto(
        String month,
        BigDecimal revenue,
        long ordersCount,
        boolean isCurrent
) {
}
