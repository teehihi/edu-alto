package com.edualto.commerce.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderCreatedResponse(UUID orderId, String status, String currency, BigDecimal subtotal,
                                   BigDecimal total, String paymentMethod, String paymentUrl,
                                   ManualPaymentInstructions instructions) {
    public record ManualPaymentInstructions(String kind, String recipientName, String bankName,
                                            String accountNumber, String walletPhone, BigDecimal amount,
                                            String transferReference, String qrUrl) {
    }
}
