package com.edualto.commerce;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.edualto.commerce.config.MoMoProperties;
import com.edualto.commerce.config.SepayProperties;
import com.edualto.commerce.config.StripeProperties;
import com.edualto.commerce.config.VnPayProperties;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.gateway.PaymentGatewayRegistry;
import com.edualto.commerce.gateway.PaymentInitCommand;
import com.edualto.commerce.gateway.PaymentInitResult;
import com.edualto.commerce.gateway.PaymentWebhookCommand;
import com.edualto.commerce.gateway.PaymentWebhookResult;
import com.edualto.commerce.gateway.provider.MoMoPaymentGateway;
import com.edualto.commerce.gateway.provider.SepayPaymentGateway;
import com.edualto.commerce.gateway.provider.StripePaymentGateway;
import com.edualto.commerce.gateway.provider.VietQrPaymentGateway;
import com.edualto.commerce.gateway.provider.VnPayPaymentGateway;
import com.edualto.commerce.gateway.util.PaymentCryptoUtils;
import com.edualto.common.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class PaymentGatewaysTest {

    private ObjectMapper objectMapper;
    private RestClient restClient;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        restClient = RestClient.builder().build();
    }

    @Test
    void paymentGatewayRegistryResolvesAllConfiguredGateways() {
        VnPayProperties vnpayProps = new VnPayProperties("TMN", "SECRET", "https://url.test", "https://return.test");
        MoMoProperties momoProps = new MoMoProperties("MOMO", "KEY", "SECRET", "https://endpoint.test", "https://return.test", "https://ipn.test");
        SepayProperties sepayProps = new SepayProperties("sepay-api-key", "123456", "VCB", "HOLDER", "compact");
        StripeProperties stripeProps = new StripeProperties("sk_test_123", "whsec_123", "https://success.test", "https://cancel.test");

        PaymentGatewayRegistry registry = new PaymentGatewayRegistry(List.of(
                new VnPayPaymentGateway(vnpayProps),
                new MoMoPaymentGateway(momoProps, restClient, objectMapper),
                new SepayPaymentGateway(sepayProps, objectMapper),
                new StripePaymentGateway(stripeProps, restClient, objectMapper),
                new VietQrPaymentGateway()
        ));

        assertThat(registry.getGateway(PaymentMethod.VNPAY)).isInstanceOf(VnPayPaymentGateway.class);
        assertThat(registry.getGateway(PaymentMethod.MOMO)).isInstanceOf(MoMoPaymentGateway.class);
        assertThat(registry.getGateway(PaymentMethod.SEPAY)).isInstanceOf(SepayPaymentGateway.class);
        assertThat(registry.getGateway(PaymentMethod.STRIPE)).isInstanceOf(StripePaymentGateway.class);
        assertThat(registry.getGateway(PaymentMethod.VIETQR)).isInstanceOf(VietQrPaymentGateway.class);

        assertThat(registry.findGateway("sepay")).isPresent();
        assertThat(registry.findGateway("MOMO")).isPresent();
        assertThat(registry.findGateway("STRIPE")).isPresent();
        assertThat(registry.findGateway("UNKNOWN")).isEmpty();
    }

    @Test
    void sepayGatewayGeneratesDynamicVietQrAndProcessesWebhook() {
        SepayProperties properties = new SepayProperties("my-secret-sepay-key", "1040489156", "VCB", "NGUYEN NHAT THIEN", "compact");
        SepayPaymentGateway gateway = new SepayPaymentGateway(properties, objectMapper);

        UUID orderId = UUID.randomUUID();
        String ref = "EA" + orderId.toString().replace("-", "").substring(0, 22).toUpperCase();

        PaymentInitCommand initCommand = new PaymentInitCommand(
                orderId,
                UUID.randomUUID(),
                new BigDecimal("500000"),
                50000000L,
                "127.0.0.1",
                ref,
                OffsetDateTime.now().plusHours(1),
                List.of()
        );

        PaymentInitResult initResult = gateway.initializePayment(initCommand);

        assertThat(initResult.instructions()).isNotNull();
        assertThat(initResult.instructions().qrUrl()).contains("https://qr.sepay.vn/img?");
        assertThat(initResult.instructions().qrUrl()).contains("acc=1040489156");
        assertThat(initResult.instructions().qrUrl()).contains("amount=500000");
        assertThat(initResult.instructions().qrUrl()).contains("des=" + ref);

        String jsonPayload = """
                {
                    "id": 99999,
                    "gateway": "VCB",
                    "transactionDate": "2026-10-08 12:00:00",
                    "accountNumber": "1040489156",
                    "content": "Thanh toan khoa hoc %s tai EduAlto",
                    "transferType": "in",
                    "transferAmount": 500000
                }
                """.formatted(ref);

        PaymentWebhookCommand webhookCommand = new PaymentWebhookCommand(
                jsonPayload,
                Map.of("authorization", "Apikey my-secret-sepay-key"),
                Map.of()
        );

        PaymentWebhookResult webhookResult = gateway.processWebhook(webhookCommand);

        assertThat(webhookResult.successful()).isTrue();
        assertThat(webhookResult.signatureValid()).isTrue();
        assertThat(webhookResult.orderLookupKey()).isEqualTo(ref);
        assertThat(webhookResult.amountMinorUnits()).isEqualTo(50000000L);
    }

    @Test
    void sepayGatewayRejectsInvalidApiKey() {
        SepayProperties properties = new SepayProperties("my-secret-sepay-key", "1040489156", "VCB", "NGUYEN NHAT THIEN", "compact");
        SepayPaymentGateway gateway = new SepayPaymentGateway(properties, objectMapper);

        PaymentWebhookCommand badAuth = new PaymentWebhookCommand(
                "{}",
                Map.of("authorization", "Apikey wrong-key"),
                Map.of()
        );

        PaymentWebhookResult result = gateway.processWebhook(badAuth);
        assertThat(result.signatureValid()).isFalse();
    }

    @Test
    void momoGatewayVerifiesValidIpnSignature() {
        String secretKey = "momo-secret-key";
        MoMoProperties properties = new MoMoProperties("MOMO_PARTNER", "MOMO_ACCESS", secretKey, "https://momo.test", "https://return.test", "https://ipn.test");
        MoMoPaymentGateway gateway = new MoMoPaymentGateway(properties, restClient, objectMapper);

        String orderId = UUID.randomUUID().toString();
        String amount = "250000";
        String extraData = "";
        String message = "Successful.";
        String orderInfo = "EduAlto Order";
        String orderType = "momo_wallet";
        String partnerCode = "MOMO_PARTNER";
        String payType = "qr";
        String requestId = UUID.randomUUID().toString();
        String responseTime = "1728374400000";
        int resultCode = 0;
        String transId = "987654321";

        String rawSignature = "accessKey=" + properties.accessKey()
                + "&amount=" + amount
                + "&extraData=" + extraData
                + "&message=" + message
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&orderType=" + orderType
                + "&partnerCode=" + partnerCode
                + "&payType=" + payType
                + "&requestId=" + requestId
                + "&responseTime=" + responseTime
                + "&resultCode=" + resultCode
                + "&transId=" + transId;

        String signature = PaymentCryptoUtils.hmacSha256(secretKey, rawSignature);

        String json = """
                {
                    "partnerCode": "%s",
                    "orderId": "%s",
                    "requestId": "%s",
                    "amount": %s,
                    "orderInfo": "%s",
                    "orderType": "%s",
                    "transId": "%s",
                    "resultCode": %d,
                    "message": "%s",
                    "payType": "%s",
                    "responseTime": %s,
                    "extraData": "%s",
                    "signature": "%s"
                }
                """.formatted(partnerCode, orderId, requestId, amount, orderInfo, orderType, transId, resultCode, message, payType, responseTime, extraData, signature);

        PaymentWebhookCommand command = new PaymentWebhookCommand(json, Map.of(), Map.of());
        PaymentWebhookResult result = gateway.processWebhook(command);

        assertThat(result.signatureValid()).isTrue();
        assertThat(result.successful()).isTrue();
        assertThat(result.orderLookupKey()).isEqualTo(orderId);
        assertThat(result.amountMinorUnits()).isEqualTo(25000000L);
    }

    @Test
    void stripeGatewayVerifiesStripeSignatureAndExtractsOrder() {
        String webhookSecret = "whsec_test_secret_key";
        StripeProperties properties = new StripeProperties("sk_test_key", webhookSecret, "https://success.test", "https://cancel.test");
        StripePaymentGateway gateway = new StripePaymentGateway(properties, restClient, objectMapper);

        String orderId = UUID.randomUUID().toString();
        String payload = """
                {
                    "type": "checkout.session.completed",
                    "data": {
                        "object": {
                            "client_reference_id": "%s",
                            "amount_total": 450000
                        }
                    }
                }
                """.formatted(orderId);

        String timestamp = "1728374400";
        String signedPayload = timestamp + "." + payload;
        String signature = PaymentCryptoUtils.hmacSha256(webhookSecret, signedPayload);

        PaymentWebhookCommand command = new PaymentWebhookCommand(
                payload,
                Map.of("stripe-signature", "t=" + timestamp + ",v1=" + signature),
                Map.of()
        );

        PaymentWebhookResult result = gateway.processWebhook(command);

        assertThat(result.signatureValid()).isTrue();
        assertThat(result.successful()).isTrue();
        assertThat(result.orderLookupKey()).isEqualTo(orderId);
        assertThat(result.amountMinorUnits()).isEqualTo(45000000L);
    }

    @Test
    void stripeGatewayRejectsInvalidSignature() {
        StripeProperties properties = new StripeProperties("sk_test_key", "whsec_test_secret_key", "https://success.test", "https://cancel.test");
        StripePaymentGateway gateway = new StripePaymentGateway(properties, restClient, objectMapper);

        PaymentWebhookCommand command = new PaymentWebhookCommand(
                "{}",
                Map.of("stripe-signature", "t=12345,v1=bad_signature"),
                Map.of()
        );

        PaymentWebhookResult result = gateway.processWebhook(command);
        assertThat(result.signatureValid()).isFalse();
    }
}
