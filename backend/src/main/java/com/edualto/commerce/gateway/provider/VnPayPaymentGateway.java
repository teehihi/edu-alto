package com.edualto.commerce.gateway.provider;

import com.edualto.commerce.config.VnPayProperties;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.gateway.PaymentGateway;
import com.edualto.commerce.gateway.PaymentInitCommand;
import com.edualto.commerce.gateway.PaymentInitResult;
import com.edualto.commerce.gateway.PaymentWebhookCommand;
import com.edualto.commerce.gateway.PaymentWebhookResult;
import com.edualto.commerce.gateway.util.PaymentCryptoUtils;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Component;

@Component
public class VnPayPaymentGateway implements PaymentGateway {

    private static final DateTimeFormatter VNPAY_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final VnPayProperties properties;

    public VnPayPaymentGateway(VnPayProperties properties) {
        this.properties = properties;
    }

    @Override
    public PaymentMethod getPaymentMethod() {
        return PaymentMethod.VNPAY;
    }

    @Override
    public boolean isConfigured() {
        return properties != null && properties.isConfigured();
    }

    @Override
    public PaymentInitResult initializePayment(PaymentInitCommand command) {
        ZonedDateTime now = ZonedDateTime.now(VIETNAM_ZONE);
        ZonedDateTime expiresAt = command.expiresAt() == null
                ? now.plusMinutes(15)
                : command.expiresAt().atZoneSameInstant(VIETNAM_ZONE);

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", properties.tmnCode());
        params.put("vnp_Amount", Long.toString(command.amountMinorUnits()));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", command.orderId().toString());
        params.put("vnp_OrderInfo", "Thanh toan don hang EduAlto " + command.orderId());
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", properties.returnUrl());
        params.put("vnp_IpAddr", normalizeIp(command.clientIp()));
        params.put("vnp_CreateDate", now.format(VNPAY_DATE));
        params.put("vnp_ExpireDate", expiresAt.format(VNPAY_DATE));

        String hashData = PaymentCryptoUtils.toQueryString(params);
        params.put("vnp_SecureHash", PaymentCryptoUtils.hmacSha512(properties.hashSecret(), hashData));

        String paymentUrl = properties.paymentUrl() + "?" + PaymentCryptoUtils.toQueryString(params);
        return PaymentInitResult.online(paymentUrl);
    }

    @Override
    public PaymentWebhookResult processWebhook(PaymentWebhookCommand command) {
        Map<String, String> parameters = command.parameters();
        if (!isConfigured() || !isValidSignature(parameters)) {
            return PaymentWebhookResult.invalidSignature("Checksum invalid", Map.of("RspCode", "97", "Message", "Checksum invalid"));
        }

        String txnRef = parameters.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            return PaymentWebhookResult.failed(null, "Order not found", Map.of("RspCode", "01", "Message", "Order not found"));
        }

        long callbackAmount;
        try {
            callbackAmount = Long.parseLong(parameters.getOrDefault("vnp_Amount", "0"));
        } catch (NumberFormatException e) {
            return PaymentWebhookResult.failed(txnRef, "Invalid amount", Map.of("RspCode", "04", "Message", "Invalid amount"));
        }

        boolean success = "00".equals(parameters.get("vnp_ResponseCode"))
                && "00".equals(parameters.get("vnp_TransactionStatus"));

        if (!success) {
            return PaymentWebhookResult.failed(txnRef, "Payment failed", Map.of("RspCode", "00", "Message", "Confirm Success"));
        }

        return PaymentWebhookResult.success(txnRef, callbackAmount, "Confirm Success", Map.of("RspCode", "00", "Message", "Confirm Success"));
    }

    private boolean isValidSignature(Map<String, String> parameters) {
        if (!properties.tmnCode().equals(parameters.get("vnp_TmnCode"))) {
            return false;
        }
        String receivedHash = parameters.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return false;
        }
        Map<String, String> signedParams = new TreeMap<>(parameters);
        signedParams.remove("vnp_SecureHash");
        signedParams.remove("vnp_SecureHashType");

        String expected = PaymentCryptoUtils.hmacSha512(properties.hashSecret(), PaymentCryptoUtils.toQueryString(signedParams));
        return PaymentCryptoUtils.constantTimeEquals(expected, receivedHash);
    }

    private static String normalizeIp(String ip) {
        if (ip == null || ip.isBlank() || "0:0:0:0:0:0:0:1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip.length() > 45 ? ip.substring(0, 45) : ip;
    }
}
