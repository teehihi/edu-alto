package com.edualto.commerce.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConfirmManualPaymentRequest(
        @NotBlank(message = "Vui lòng nhập mã tham chiếu biên nhận")
        @Size(max = 200, message = "Mã tham chiếu tối đa 200 ký tự")
        String receiptReference
) {
}
