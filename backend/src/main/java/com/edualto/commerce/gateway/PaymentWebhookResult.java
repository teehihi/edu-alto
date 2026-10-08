package com.edualto.commerce.gateway;

import java.util.Collections;
import java.util.Map;

public record PaymentWebhookResult(
        boolean successful,
        boolean signatureValid,
        String orderLookupKey,
        long amountMinorUnits,
        String responseCode,
        String message,
        Map<String, Object> responsePayload
) {
    public PaymentWebhookResult {
        if (responsePayload == null) {
            responsePayload = Collections.emptyMap();
        }
    }

    public static PaymentWebhookResult invalidSignature(String message, Map<String, Object> responsePayload) {
        return new PaymentWebhookResult(false, false, null, 0, "INVALID_SIGNATURE", message, responsePayload);
    }

    public static PaymentWebhookResult success(
            String orderLookupKey,
            long amountMinorUnits,
            String message,
            Map<String, Object> responsePayload
    ) {
        return new PaymentWebhookResult(true, true, orderLookupKey, amountMinorUnits, "00", message, responsePayload);
    }

    public static PaymentWebhookResult failed(
            String orderLookupKey,
            String message,
            Map<String, Object> responsePayload
    ) {
        return new PaymentWebhookResult(false, true, orderLookupKey, 0, "FAILED", message, responsePayload);
    }
}
