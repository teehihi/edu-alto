package com.edualto.commerce.gateway;

import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.common.exception.BusinessException;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class PaymentGatewayRegistry {

    private final Map<PaymentMethod, PaymentGateway> gateways;

    public PaymentGatewayRegistry(List<PaymentGateway> gatewayList) {
        this.gateways = new EnumMap<>(PaymentMethod.class);
        for (PaymentGateway gateway : gatewayList) {
            this.gateways.put(gateway.getPaymentMethod(), gateway);
        }
    }

    public PaymentGateway getGateway(PaymentMethod method) {
        PaymentGateway gateway = gateways.get(method);
        if (gateway == null) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "UNSUPPORTED_PAYMENT_METHOD",
                    "Phương thức thanh toán không được hỗ trợ: " + method
            );
        }
        return gateway;
    }

    public Optional<PaymentGateway> findGateway(String provider) {
        if (provider == null || provider.isBlank()) {
            return Optional.empty();
        }
        try {
            PaymentMethod method = PaymentMethod.valueOf(provider.trim().toUpperCase());
            return Optional.ofNullable(gateways.get(method));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public PaymentGateway requireGateway(String provider) {
        return findGateway(provider).orElseThrow(() -> new BusinessException(
                HttpStatus.BAD_REQUEST,
                "UNSUPPORTED_PAYMENT_PROVIDER",
                "Cổng thanh toán không tồn tại: " + provider
        ));
    }
}
