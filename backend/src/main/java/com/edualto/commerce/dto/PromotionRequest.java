package com.edualto.commerce.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PromotionRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 40) String code,
        @NotBlank String discountType,
        @NotNull BigDecimal discountValue,
        Integer maxRedemptions,
        @NotNull OffsetDateTime startsAt,
        @NotNull OffsetDateTime endsAt,
        String status
) {
}
