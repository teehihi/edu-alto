package com.edualto.commerce.gateway;

import java.util.Collections;
import java.util.Map;

public record PaymentWebhookCommand(
        String rawPayload,
        Map<String, String> headers,
        Map<String, String> parameters
) {
    public PaymentWebhookCommand {
        if (headers == null) {
            headers = Collections.emptyMap();
        }
        if (parameters == null) {
            parameters = Collections.emptyMap();
        }
    }
}
