package com.edualto.commerce.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "edualto.payment.vnpay")
public record VnPayProperties(
        String tmnCode,
        String hashSecret,
        String paymentUrl,
        String returnUrl
) {
    public VnPayProperties {
        if (paymentUrl == null || paymentUrl.isBlank()) {
            paymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        }
    }

    public boolean isConfigured() {
        return tmnCode != null && !tmnCode.isBlank() && hashSecret != null && !hashSecret.isBlank()
                && returnUrl != null && !returnUrl.isBlank();
    }
}
