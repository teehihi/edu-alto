package com.edualto.commerce.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "edualto.payment.momo")
public record MoMoProperties(
        String partnerCode,
        String accessKey,
        String secretKey,
        String endpoint,
        String redirectUrl,
        String ipnUrl
) {
    public MoMoProperties {
        if (endpoint == null || endpoint.isBlank()) {
            endpoint = "https://test-payment.momo.vn/v2/gateway/api/create";
        }
    }

    public boolean isConfigured() {
        return partnerCode != null && !partnerCode.isBlank()
                && accessKey != null && !accessKey.isBlank()
                && secretKey != null && !secretKey.isBlank()
                && redirectUrl != null && !redirectUrl.isBlank();
    }
}
