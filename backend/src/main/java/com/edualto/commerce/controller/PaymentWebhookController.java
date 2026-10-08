package com.edualto.commerce.controller;

import com.edualto.commerce.service.CommerceService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentWebhookController {

    private final CommerceService commerce;

    public PaymentWebhookController(CommerceService commerce) {
        this.commerce = commerce;
    }

    @PostMapping(value = "/momo/ipn", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "MoMo IPN webhook callback")
    public ResponseEntity<Map<String, Object>> momoIpn(@RequestBody String rawPayload, HttpServletRequest request) {
        return handleWebhook("MOMO", rawPayload, request);
    }

    @PostMapping(value = {"/sepay/webhook", "/sepay/ipn"}, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "SePay automated bank transfer and payment gateway webhook callback")
    public ResponseEntity<Map<String, Object>> sepayWebhook(@RequestBody String rawPayload, HttpServletRequest request) {
        return handleWebhook("SEPAY", rawPayload, request);
    }

    @PostMapping(value = "/stripe/webhook", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Stripe checkout session and payment webhook")
    public ResponseEntity<Map<String, Object>> stripeWebhook(@RequestBody String rawPayload, HttpServletRequest request) {
        return handleWebhook("STRIPE", rawPayload, request);
    }

    private ResponseEntity<Map<String, Object>> handleWebhook(String provider, String rawPayload, HttpServletRequest request) {
        Map<String, String> headers = Collections.list(request.getHeaderNames()).stream()
                .collect(Collectors.toMap(String::toLowerCase, request::getHeader, (first, second) -> first));

        Map<String, String> params = request.getParameterMap().entrySet().stream()
                .filter(entry -> entry.getValue() != null && entry.getValue().length > 0)
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue()[0]));

        Map<String, Object> response = commerce.processGatewayWebhook(provider, rawPayload, headers, params);
        return ResponseEntity.ok(response);
    }
}
