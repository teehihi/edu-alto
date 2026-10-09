package com.edualto.commerce.gateway;

import com.edualto.commerce.dto.OrderCreatedResponse;
import java.util.List;
import java.util.Map;

public record PaymentInitResult(
        String orderStatus,
        String paymentUrl,
        OrderCreatedResponse.ManualPaymentInstructions instructions,
        String providerTxnRef,
        OrderCreatedResponse.PaymentForm paymentForm
) {
    public PaymentInitResult(String orderStatus, String paymentUrl,
                             OrderCreatedResponse.ManualPaymentInstructions instructions,
                             String providerTxnRef) {
        this(orderStatus, paymentUrl, instructions, providerTxnRef, null);
    }

    public static PaymentInitResult online(String paymentUrl) {
        return new PaymentInitResult("PENDING_PAYMENT", paymentUrl, null, null, null);
    }

    public static PaymentInitResult formPost(String action, Map<String, String> fields) {
        List<OrderCreatedResponse.PaymentFormField> orderedFields = fields.entrySet().stream()
                .map(entry -> new OrderCreatedResponse.PaymentFormField(entry.getKey(), entry.getValue()))
                .toList();
        return new PaymentInitResult("PENDING_PAYMENT", null, null, null,
                new OrderCreatedResponse.PaymentForm(action, orderedFields));
    }

    public static PaymentInitResult manual(OrderCreatedResponse.ManualPaymentInstructions instructions) {
        return new PaymentInitResult("PAYMENT_REVIEW", null, instructions, null, null);
    }

    public static PaymentInitResult autoTransfer(OrderCreatedResponse.ManualPaymentInstructions instructions) {
        return new PaymentInitResult("PENDING_PAYMENT", null, instructions, null, null);
    }
}
