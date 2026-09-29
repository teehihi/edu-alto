package com.edualto.commerce.dto;

import com.edualto.commerce.domain.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất một khóa học")
        @Size(max = 20, message = "Mỗi đơn hàng tối đa 20 khóa học")
        List<UUID> courseIds,
        @NotNull(message = "Vui lòng chọn phương thức thanh toán")
        PaymentMethod paymentMethod
) {
}
