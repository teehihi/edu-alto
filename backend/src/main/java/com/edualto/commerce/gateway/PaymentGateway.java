package com.edualto.commerce.gateway;

import com.edualto.commerce.domain.PaymentMethod;

public interface PaymentGateway {

    PaymentMethod getPaymentMethod();

    boolean isConfigured();

    PaymentInitResult initializePayment(PaymentInitCommand command);

    PaymentWebhookResult processWebhook(PaymentWebhookCommand command);
}
