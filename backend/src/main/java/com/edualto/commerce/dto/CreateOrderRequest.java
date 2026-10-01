package com.edualto.commerce.dto;

import com.edualto.commerce.domain.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record CreateOrderRequest(
        @NotEmpty(message = "Vui lòng chọn ít nhất một khóa học")
        @Size(max = 20, message = "Mỗi đơn hàng tối đa 20 khóa học")
        List<UUID> courseIds,
        @NotNull(message = "Vui lòng chọn phương thức thanh toán")
        PaymentMethod paymentMethod,
        @NotBlank(message = "Vui lòng nhập số điện thoại liên hệ")
        @Pattern(regexp = "^0[0-9]{9}$", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0")
        String phoneNumber,
        @Size(max = 40, message = "Mã khuyến mãi tối đa 40 ký tự")
        String promotionCode
) {
}
