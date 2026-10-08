package com.edualto.commerce.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "edualto.payment.sepay")
public record SepayProperties(
        String merchantId,
        String secretKey,
        String checkoutUrl,
        String successUrl,
        String cancelUrl,
        String errorUrl,
        String apiKey,
        String accountNumber,
        String bankName,
        String accountHolder,
        String qrTemplate
) {
    public SepayProperties {
        if (checkoutUrl == null || checkoutUrl.isBlank()) {
            checkoutUrl = "https://pay.sepay.vn/v1/checkout/init";
        }
        if (accountNumber == null || accountNumber.isBlank()) {
            accountNumber = "1040489156";
        }
        if (bankName == null || bankName.isBlank()) {
            bankName = "VCB";
        }
        if (accountHolder == null || accountHolder.isBlank()) {
            accountHolder = "NGUYEN NHAT THIEN";
        }
        if (qrTemplate == null || qrTemplate.isBlank()) {
            qrTemplate = "compact";
        }
    }

    public SepayProperties(String apiKey, String accountNumber, String bankName, String accountHolder, String qrTemplate) {
        this(null, null, null, null, null, null, apiKey, accountNumber, bankName, accountHolder, qrTemplate);
    }

    public boolean hasMerchantPg() {
        return merchantId != null && !merchantId.isBlank()
                && secretKey != null && !secretKey.isBlank();
    }

    public boolean isConfigured() {
        return hasMerchantPg() || (apiKey != null && !apiKey.isBlank());
    }
}
