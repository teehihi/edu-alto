package com.edualto.commerce.gateway;

import com.edualto.commerce.dto.OrderCreatedResponse;

public record PaymentInitResult(
        String orderStatus,
        String paymentUrl,
        OrderCreatedResponse.ManualPaymentInstructions instructions,
        String providerTxnRef
) {
    public static PaymentInitResult online(String paymentUrl) {
        return new PaymentInitResult("PENDING_PAYMENT", paymentUrl, null, null);
    }

    public static PaymentInitResult manual(OrderCreatedResponse.ManualPaymentInstructions instructions) {
        return new PaymentInitResult("PAYMENT_REVIEW", null, instructions, null);
    }

    public static PaymentInitResult autoTransfer(OrderCreatedResponse.ManualPaymentInstructions instructions) {
        return new PaymentInitResult("PENDING_PAYMENT", null, instructions, null);
    }
}
