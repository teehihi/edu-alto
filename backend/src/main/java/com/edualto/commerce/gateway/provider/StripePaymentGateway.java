package com.edualto.commerce.gateway.provider;

import com.edualto.commerce.config.StripeProperties;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.gateway.PaymentGateway;
import com.edualto.commerce.gateway.PaymentInitCommand;
import com.edualto.commerce.gateway.PaymentInitResult;
import com.edualto.commerce.gateway.PaymentWebhookCommand;
import com.edualto.commerce.gateway.PaymentWebhookResult;
import com.edualto.commerce.gateway.util.PaymentCryptoUtils;
import com.edualto.common.exception.BusinessException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class StripePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentGateway.class);
    private static final String STRIPE_API_URL = "https://api.stripe.com/v1/checkout/sessions";

    private final StripeProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public StripePaymentGateway(StripeProperties properties, RestClient paymentRestClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = paymentRestClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public PaymentMethod getPaymentMethod() {
        return PaymentMethod.STRIPE;
    }

    @Override
    public boolean isConfigured() {
        return properties != null && properties.isConfigured();
    }

    @Override
    public PaymentInitResult initializePayment(PaymentInitCommand command) {
        if (!isConfigured()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_GATEWAY_NOT_CONFIGURED",
                    "Cổng thanh toán Stripe chưa được cấu hình");
        }

        String orderId = command.orderId().toString();
        long amountVnd = command.total().setScale(0, RoundingMode.UNNECESSARY).longValue();

        String successUrl = properties.successUrl() + (properties.successUrl().contains("?") ? "&" : "?")
                + "order_id=" + orderId + "&session_id={CHECKOUT_SESSION_ID}";
        String cancelUrl = properties.cancelUrl() + (properties.cancelUrl().contains("?") ? "&" : "?")
                + "order_id=" + orderId + "&status=cancelled";

        Map<String, String> formParams = new LinkedHashMap<>();
        formParams.put("mode", "payment");
        formParams.put("client_reference_id", orderId);
        formParams.put("metadata[order_id]", orderId);
        formParams.put("success_url", successUrl);
        formParams.put("cancel_url", cancelUrl);
        formParams.put("line_items[0][price_data][currency]", "vnd");
        formParams.put("line_items[0][price_data][unit_amount]", Long.toString(amountVnd));
        formParams.put("line_items[0][price_data][product_data][name]", "EduAlto - Don hang " + orderId);
        formParams.put("line_items[0][quantity]", "1");

        String formData = PaymentCryptoUtils.toQueryString(formParams);

        try {
            Map<?, ?> response = restClient.post()
                    .uri(STRIPE_API_URL)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.get("url") != null) {
                String sessionUrl = response.get("url").toString();
                String sessionId = response.get("id") != null ? response.get("id").toString() : null;
                return new PaymentInitResult("PENDING_PAYMENT", sessionUrl, null, sessionId);
            }

            log.error("Stripe session creation failed with empty URL: {}", response);
            throw new BusinessException(HttpStatus.BAD_GATEWAY, "STRIPE_INIT_FAILED", "Khởi tạo thanh toán Stripe không thành công");
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            log.error("Failed to connect to Stripe API for order {}", orderId, ex);
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_GATEWAY_ERROR", "Không thể kết nối tới cổng thanh toán Stripe");
        }
    }

    @Override
    public PaymentWebhookResult processWebhook(PaymentWebhookCommand command) {
        if (!isConfigured()) {
            return PaymentWebhookResult.invalidSignature("Stripe webhook unconfigured", Map.of("error", "Unconfigured"));
        }

        String signatureHeader = command.headers().get("stripe-signature");
        if (signatureHeader == null || signatureHeader.isBlank()) {
            log.warn("Stripe webhook missing stripe-signature header");
            return PaymentWebhookResult.invalidSignature("Missing Stripe signature header", Map.of("error", "Missing signature"));
        }

        if (!isValidStripeSignature(signatureHeader, command.rawPayload())) {
            log.warn("Stripe webhook signature validation failed");
            return PaymentWebhookResult.invalidSignature("Invalid Stripe signature", Map.of("error", "Invalid signature"));
        }

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(command.rawPayload(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to parse Stripe webhook JSON payload", e);
            return PaymentWebhookResult.invalidSignature("Malformed JSON payload", Map.of("error", "Invalid JSON"));
        }

        String eventType = String.valueOf(payload.getOrDefault("type", ""));
        if (!"checkout.session.completed".equals(eventType) && !"payment_intent.succeeded".equals(eventType)) {
            return PaymentWebhookResult.failed(null, "Ignored event type: " + eventType, Map.of("received", true));
        }

        Object dataObj = payload.get("data");
        if (!(dataObj instanceof Map<?, ?> dataMap)) {
            return PaymentWebhookResult.failed(null, "Missing data object in event", Map.of("received", true));
        }

        Object objectObj = dataMap.get("object");
        if (!(objectObj instanceof Map<?, ?> objMap)) {
            return PaymentWebhookResult.failed(null, "Missing event object details", Map.of("received", true));
        }

        String orderId = extractOrderId(objMap);
        if (orderId == null || orderId.isBlank()) {
            log.warn("Stripe event {} has no order ID in client_reference_id or metadata", eventType);
            return PaymentWebhookResult.failed(null, "Missing order ID in Stripe event", Map.of("received", true));
        }

        long amountTotalVnd = parseAmount(objMap.get("amount_total"));
        long amountMinorUnits = amountTotalVnd * 100;

        return PaymentWebhookResult.success(orderId, amountMinorUnits, "Stripe payment succeeded", Map.of("received", true));
    }

    private boolean isValidStripeSignature(String signatureHeader, String rawPayload) {
        String timestamp = null;
        String[] parts = signatureHeader.split(",");
        for (String part : parts) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length == 2 && "t".equals(kv[0])) {
                timestamp = kv[1];
                break;
            }
        }

        if (timestamp == null || timestamp.isBlank()) {
            return false;
        }

        String signedPayload = timestamp + "." + rawPayload;
        String expectedSignature = PaymentCryptoUtils.hmacSha256(properties.webhookSecret(), signedPayload);

        for (String part : parts) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length == 2 && "v1".equals(kv[0])) {
                if (PaymentCryptoUtils.constantTimeEquals(expectedSignature, kv[1])) {
                    return true;
                }
            }
        }
        return false;
    }

    private static String extractOrderId(Map<?, ?> objMap) {
        if (objMap.get("client_reference_id") != null) {
            return objMap.get("client_reference_id").toString();
        }
        if (objMap.get("metadata") instanceof Map<?, ?> metadata) {
            if (metadata.get("order_id") != null) {
                return metadata.get("order_id").toString();
            }
        }
        return null;
    }

    private static long parseAmount(Object value) {
        if (value instanceof Number n) {
            return n.longValue();
        }
        if (value instanceof String s) {
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return 0L;
    }
}
