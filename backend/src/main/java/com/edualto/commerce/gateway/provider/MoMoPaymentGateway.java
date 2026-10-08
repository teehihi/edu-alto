package com.edualto.commerce.gateway.provider;

import com.edualto.commerce.config.MoMoProperties;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.dto.OrderCreatedResponse;
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
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class MoMoPaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(MoMoPaymentGateway.class);

    private final MoMoProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public MoMoPaymentGateway(MoMoProperties properties, RestClient paymentRestClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = paymentRestClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public PaymentMethod getPaymentMethod() {
        return PaymentMethod.MOMO;
    }

    @Override
    public boolean isConfigured() {
        return properties != null && properties.isConfigured();
    }

    @Override
    public PaymentInitResult initializePayment(PaymentInitCommand command) {
        if (!isConfigured()) {
            OrderCreatedResponse.ManualPaymentInstructions instructions = new OrderCreatedResponse.ManualPaymentInstructions(
                    "MOMO_TRANSFER",
                    "NGUYEN NHAT THIEN",
                    null,
                    null,
                    "0389037546",
                    command.total(),
                    command.transferReference(),
                    null
            );
            return PaymentInitResult.manual(instructions);
        }

        String requestId = UUID.randomUUID().toString();
        String orderId = command.orderId().toString();
        long amount = command.total().setScale(0, RoundingMode.UNNECESSARY).longValue();
        String orderInfo = "Thanh toan don hang EduAlto " + orderId;
        String redirectUrl = properties.redirectUrl();
        String ipnUrl = properties.ipnUrl() != null && !properties.ipnUrl().isBlank()
                ? properties.ipnUrl()
                : properties.redirectUrl();
        String requestType = "captureWallet";
        String extraData = "";

        String rawSignature = "accessKey=" + properties.accessKey()
                + "&amount=" + amount
                + "&extraData=" + extraData
                + "&ipnUrl=" + ipnUrl
                + "&orderId=" + orderId
                + "&orderInfo=" + orderInfo
                + "&partnerCode=" + properties.partnerCode()
                + "&redirectUrl=" + redirectUrl
                + "&requestId=" + requestId
                + "&requestType=" + requestType;

        String signature = PaymentCryptoUtils.hmacSha256(properties.secretKey(), rawSignature);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("partnerCode", properties.partnerCode());
        requestBody.put("accessKey", properties.accessKey());
        requestBody.put("requestId", requestId);
        requestBody.put("amount", amount);
        requestBody.put("orderId", orderId);
        requestBody.put("orderInfo", orderInfo);
        requestBody.put("redirectUrl", redirectUrl);
        requestBody.put("ipnUrl", ipnUrl);
        requestBody.put("requestType", requestType);
        requestBody.put("extraData", extraData);
        requestBody.put("lang", "vi");
        requestBody.put("signature", signature);

        try {
            Map<?, ?> response = restClient.post()
                    .uri(properties.endpoint())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.get("payUrl") != null) {
                String payUrl = response.get("payUrl").toString();
                return PaymentInitResult.online(payUrl);
            }

            String message = response != null && response.get("message") != null
                    ? response.get("message").toString()
                    : "MoMo API error";
            log.error("Failed to create MoMo payment for order {}: {}", orderId, message);
            throw new BusinessException(HttpStatus.BAD_GATEWAY, "MOMO_INIT_FAILED", "Khởi tạo thanh toán MoMo không thành công: " + message);
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            log.error("Error connecting to MoMo gateway for order {}", orderId, ex);
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_GATEWAY_ERROR", "Không thể kết nối tới cổng thanh toán MoMo");
        }
    }

    @Override
    public PaymentWebhookResult processWebhook(PaymentWebhookCommand command) {
        if (!isConfigured()) {
            return PaymentWebhookResult.invalidSignature("MoMo gateway not configured", Map.of("resultCode", 97, "message", "Gateway unconfigured"));
        }

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(command.rawPayload(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return PaymentWebhookResult.invalidSignature("Malformed JSON payload", Map.of("resultCode", 97, "message", "Invalid payload"));
        }

        String receivedSignature = (String) payload.get("signature");
        if (receivedSignature == null || receivedSignature.isBlank()) {
            return PaymentWebhookResult.invalidSignature("Missing signature", Map.of("resultCode", 97, "message", "Missing signature"));
        }

        String partnerCode = String.valueOf(payload.getOrDefault("partnerCode", ""));
        String orderId = String.valueOf(payload.getOrDefault("orderId", ""));
        String requestId = String.valueOf(payload.getOrDefault("requestId", ""));
        String amount = String.valueOf(payload.getOrDefault("amount", "0"));
        String orderInfo = String.valueOf(payload.getOrDefault("orderInfo", ""));
        String orderType = String.valueOf(payload.getOrDefault("orderType", ""));
        String transId = String.valueOf(payload.getOrDefault("transId", ""));
        int resultCode = parseResultCode(payload.get("resultCode"));
        String message = String.valueOf(payload.getOrDefault("message", ""));
        String payType = String.valueOf(payload.getOrDefault("payType", ""));
        String responseTime = String.valueOf(payload.getOrDefault("responseTime", ""));
        String extraData = String.valueOf(payload.getOrDefault("extraData", ""));

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

        String expectedSignature = PaymentCryptoUtils.hmacSha256(properties.secretKey(), rawSignature);
        if (!PaymentCryptoUtils.constantTimeEquals(expectedSignature, receivedSignature)) {
            return PaymentWebhookResult.invalidSignature("Checksum invalid", Map.of("resultCode", 97, "message", "Checksum invalid"));
        }

        long amountVnd = Long.parseLong(amount);
        long amountMinorUnits = amountVnd * 100;

        if (resultCode == 0) {
            return PaymentWebhookResult.success(orderId, amountMinorUnits, "MoMo payment success", Map.of("resultCode", 0, "message", "Success"));
        } else {
            return PaymentWebhookResult.failed(orderId, "MoMo payment failed: " + message, Map.of("resultCode", 0, "message", "Success"));
        }
    }

    private static int parseResultCode(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        if (value instanceof String s) {
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException ignored) {
            }
        }
        return -1;
    }
}
