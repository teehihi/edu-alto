package com.edualto.commerce.gateway.provider;

import com.edualto.commerce.config.SepayProperties;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.dto.OrderCreatedResponse;
import com.edualto.commerce.gateway.PaymentGateway;
import com.edualto.commerce.gateway.PaymentInitCommand;
import com.edualto.commerce.gateway.PaymentInitResult;
import com.edualto.commerce.gateway.PaymentWebhookCommand;
import com.edualto.commerce.gateway.PaymentWebhookResult;
import com.edualto.commerce.gateway.util.PaymentCryptoUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class SepayPaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(SepayPaymentGateway.class);
    private static final Pattern ORDER_REF_PATTERN = Pattern.compile("EA[0-9A-Z]{18,24}");
    private static final Pattern UUID_PATTERN = Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

    private final SepayProperties properties;
    private final ObjectMapper objectMapper;

    public SepayPaymentGateway(SepayProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    public PaymentMethod getPaymentMethod() {
        return PaymentMethod.SEPAY;
    }

    @Override
    public boolean isConfigured() {
        return properties != null && properties.isConfigured();
    }

    @Override
    public PaymentInitResult initializePayment(PaymentInitCommand command) {
        if (properties.hasMerchantPg()) {
            return initializeSePayPg(command);
        }
        return initializeVietQr(command);
    }

    private PaymentInitResult initializeSePayPg(PaymentInitCommand command) {
        String amountStr = command.total().setScale(0, RoundingMode.UNNECESSARY).toPlainString();
        String orderIdStr = command.orderId().toString();

        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("order_amount", amountStr);
        fields.put("merchant", properties.merchantId());
        fields.put("currency", "VND");
        fields.put("operation", "PURCHASE");
        fields.put("order_description", "Thanh toan don hang " + orderIdStr);
        fields.put("order_invoice_number", orderIdStr);
        fields.put("payment_method", "BANK_TRANSFER");
        if (properties.successUrl() != null && !properties.successUrl().isBlank()) {
            fields.put("success_url", callbackUrl(properties.successUrl(), orderIdStr, "success"));
        }
        if (properties.errorUrl() != null && !properties.errorUrl().isBlank()) {
            fields.put("error_url", callbackUrl(properties.errorUrl(), orderIdStr, "failed"));
        }
        if (properties.cancelUrl() != null && !properties.cancelUrl().isBlank()) {
            fields.put("cancel_url", callbackUrl(properties.cancelUrl(), orderIdStr, "cancelled"));
        }
        fields.put("signature", signSePayPg(fields));

        return PaymentInitResult.formPost(properties.checkoutUrl(), fields);
    }

    private static String callbackUrl(String baseUrl, String orderId, String paymentResult) {
        String separator = baseUrl.contains("?") ? "&" : "?";
        return baseUrl + separator + "order_id=" + orderId + "&payment_result=" + paymentResult;
    }

    private PaymentInitResult initializeVietQr(PaymentInitCommand command) {
        String amountStr = command.total().setScale(0, RoundingMode.UNNECESSARY).toPlainString();
        String qrUrl = "https://qr.sepay.vn/img?acc=" + PaymentCryptoUtils.urlEncode(properties.accountNumber())
                + "&bank=" + PaymentCryptoUtils.urlEncode(properties.bankName())
                + "&amount=" + amountStr
                + "&des=" + PaymentCryptoUtils.urlEncode(command.transferReference())
                + "&template=" + PaymentCryptoUtils.urlEncode(properties.qrTemplate());

        OrderCreatedResponse.ManualPaymentInstructions instructions = new OrderCreatedResponse.ManualPaymentInstructions(
                "BANK_TRANSFER",
                properties.accountHolder(),
                properties.bankName(),
                properties.accountNumber(),
                null,
                command.total(),
                command.transferReference(),
                qrUrl
        );

        return PaymentInitResult.autoTransfer(instructions);
    }

    @Override
    public PaymentWebhookResult processWebhook(PaymentWebhookCommand command) {
        if (!isConfigured()) {
            return processWebhookPayload(command);
        }

        String xSecretKey = command.headers().get("x-secret-key");
        String authHeader = command.headers().get("authorization");

        if (properties.hasMerchantPg() && xSecretKey != null) {
            if (!PaymentCryptoUtils.constantTimeEquals(properties.secretKey(), xSecretKey.trim())) {
                log.warn("SePay PG IPN rejected: invalid X-Secret-Key header");
                return PaymentWebhookResult.invalidSignature("Unauthorized SePay IPN", Map.of("success", false, "message", "Unauthorized"));
            }
        } else if (authHeader != null && !isValidAuth(authHeader)) {
            log.warn("SePay webhook rejected: invalid Authorization header");
            return PaymentWebhookResult.invalidSignature("Unauthorized SePay webhook", Map.of("success", false, "message", "Unauthorized"));
        }

        return processWebhookPayload(command);
    }

    private PaymentWebhookResult processWebhookPayload(PaymentWebhookCommand command) {
        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(command.rawPayload(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to parse SePay webhook payload", e);
            return PaymentWebhookResult.invalidSignature("Malformed JSON payload", Map.of("success", false, "message", "Invalid payload"));
        }

        if (payload.containsKey("notification_type") || payload.containsKey("order")) {
            return processSePayPgIpn(payload);
        }

        return processSePayBankTransferWebhook(payload);
    }

    private PaymentWebhookResult processSePayPgIpn(Map<String, Object> payload) {
        String notificationType = String.valueOf(payload.getOrDefault("notification_type", ""));
        if (!"ORDER_PAID".equalsIgnoreCase(notificationType)) {
            return PaymentWebhookResult.failed(null, "Ignored notification type: " + notificationType, Map.of("success", true));
        }

        Object orderObj = payload.get("order");
        if (!(orderObj instanceof Map<?, ?> orderMap)) {
            return PaymentWebhookResult.failed(null, "Missing order object in SePay IPN", Map.of("success", false));
        }

        Object invoiceObj = orderMap.get("order_invoice_number");
        if (invoiceObj == null) {
            invoiceObj = orderMap.get("order_id");
        }
        String invoiceNumber = invoiceObj != null ? invoiceObj.toString() : "";

        long amountVnd = parseAmount(orderMap.get("order_amount"));
        long amountMinorUnits = amountVnd * 100;

        return PaymentWebhookResult.success(invoiceNumber, amountMinorUnits, "SePay payment confirmed", Map.of("success", true));
    }

    private PaymentWebhookResult processSePayBankTransferWebhook(Map<String, Object> payload) {
        String transferType = String.valueOf(payload.getOrDefault("transferType", "in"));
        if (!"in".equalsIgnoreCase(transferType)) {
            return PaymentWebhookResult.failed(null, "Ignored outgoing transfer", Map.of("success", true, "message", "Ignored outgoing transfer"));
        }

        String content = String.valueOf(payload.getOrDefault("content", ""));
        String description = String.valueOf(payload.getOrDefault("description", ""));
        String code = payload.get("code") != null ? String.valueOf(payload.get("code")) : "";

        String matchedReference = extractOrderReference(code, content, description);
        if (matchedReference == null) {
            log.warn("SePay transaction received but no order reference found in content: {}", content);
            return PaymentWebhookResult.failed(null, "Order reference not found in transaction content", Map.of("success", true, "message", "Order reference not found"));
        }

        long transferAmountVnd = parseAmount(payload.get("transferAmount"));
        long amountMinorUnits = transferAmountVnd * 100;

        return PaymentWebhookResult.success(matchedReference, amountMinorUnits, "SePay transfer confirmed", Map.of("success", true));
    }

    private boolean isValidAuth(String header) {
        String expected = properties.secretKey() != null ? properties.secretKey() : properties.apiKey();
        if (expected == null || expected.isBlank()) {
            return true;
        }
        String normalized = header.trim();
        if (normalized.regionMatches(true, 0, "Apikey ", 0, 7)) {
            normalized = normalized.substring(7).trim();
        } else if (normalized.regionMatches(true, 0, "Bearer ", 0, 7)) {
            normalized = normalized.substring(7).trim();
        }
        return PaymentCryptoUtils.constantTimeEquals(expected, normalized);
    }

    private String signSePayPg(Map<String, String> fields) {
        String signedString = fields.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .reduce((left, right) -> left + "," + right)
                .orElse("");
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.secretKey().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(signedString.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
            throw new IllegalStateException("Unable to sign SePay checkout", exception);
        }
    }

    private static String extractOrderReference(String code, String content, String description) {
        if (code != null && !code.isBlank() && code.toUpperCase().startsWith("EA")) {
            return code.toUpperCase();
        }

        String combined = (content + " " + description).toUpperCase();
        Matcher eaMatcher = ORDER_REF_PATTERN.matcher(combined);
        if (eaMatcher.find()) {
            return eaMatcher.group();
        }

        Matcher uuidMatcher = UUID_PATTERN.matcher(combined);
        if (uuidMatcher.find()) {
            return uuidMatcher.group();
        }

        return null;
    }

    private static long parseAmount(Object value) {
        if (value instanceof Number n) {
            try {
                return new BigDecimal(n.toString()).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
            } catch (NumberFormatException | ArithmeticException ignored) {
                return 0L;
            }
        }
        if (value instanceof String s) {
            try {
                return new BigDecimal(s.replace(",", "").trim())
                        .setScale(0, RoundingMode.UNNECESSARY)
                        .longValueExact();
            } catch (NumberFormatException | ArithmeticException ignored) {
            }
        }
        return 0L;
    }
}
