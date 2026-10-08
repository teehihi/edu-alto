package com.edualto.commerce.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "edualto.payment.stripe")
public record StripeProperties(
        String apiKey,
        String webhookSecret,
        String successUrl,
        String cancelUrl
) {
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank()
                && webhookSecret != null && !webhookSecret.isBlank();
    }
}
