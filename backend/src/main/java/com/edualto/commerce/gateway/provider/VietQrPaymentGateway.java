package com.edualto.commerce.gateway.provider;

import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.dto.OrderCreatedResponse;
import com.edualto.commerce.gateway.PaymentGateway;
import com.edualto.commerce.gateway.PaymentInitCommand;
import com.edualto.commerce.gateway.PaymentInitResult;
import com.edualto.commerce.gateway.PaymentWebhookCommand;
import com.edualto.commerce.gateway.PaymentWebhookResult;
import com.edualto.commerce.gateway.util.PaymentCryptoUtils;
import java.math.RoundingMode;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class VietQrPaymentGateway implements PaymentGateway {

    @Override
    public PaymentMethod getPaymentMethod() {
        return PaymentMethod.VIETQR;
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public PaymentInitResult initializePayment(PaymentInitCommand command) {
        String qrUrl = "https://img.vietqr.io/image/VCB-1040489156-compact2.png?amount="
                + command.total().setScale(0, RoundingMode.UNNECESSARY).toPlainString()
                + "&addInfo=" + PaymentCryptoUtils.urlEncode(command.transferReference())
                + "&accountName=" + PaymentCryptoUtils.urlEncode("NGUYEN NHAT THIEN");

        OrderCreatedResponse.ManualPaymentInstructions instructions = new OrderCreatedResponse.ManualPaymentInstructions(
                "BANK_TRANSFER",
                "NGUYEN NHAT THIEN",
                "Vietcombank (VCB)",
                "1040489156",
                null,
                command.total(),
                command.transferReference(),
                qrUrl
        );

        return PaymentInitResult.manual(instructions);
    }

    @Override
    public PaymentWebhookResult processWebhook(PaymentWebhookCommand command) {
        return PaymentWebhookResult.failed(null, "VietQR does not support automated webhooks; requires manual admin review", Map.of("success", false));
    }
}
