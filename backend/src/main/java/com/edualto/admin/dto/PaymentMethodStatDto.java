package com.edualto.admin.dto;

import java.math.BigDecimal;

public record PaymentMethodStatDto(
        String provider,
        String label,
        long count,
        BigDecimal amount,
        int percentage,
        String color
) {
}
