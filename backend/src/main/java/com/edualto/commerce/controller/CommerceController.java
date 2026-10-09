package com.edualto.commerce.controller;

import com.edualto.commerce.dto.CreateOrderRequest;
import com.edualto.commerce.dto.OrderCreatedResponse;
import com.edualto.commerce.dto.OrderResponse;
import com.edualto.commerce.service.CommerceService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class CommerceController {
    private final CommerceService commerce;

    public CommerceController(CommerceService commerce) {
        this.commerce = commerce;
    }

    @PostMapping("/me/orders")
    @Operation(summary = "Tạo đơn hàng thanh toán khóa học")
    public ApiResponse<OrderCreatedResponse> createOrder(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateOrderRequest request,
            HttpServletRequest servletRequest
    ) {
        return ApiResponse.ok(commerce.createOrder(principal.id(), request, servletRequest.getRemoteAddr()));
    }

    @GetMapping("/me/orders/{orderId}")
    @Operation(summary = "Xem trạng thái đơn hàng của bạn")
    public ApiResponse<OrderResponse> getOrder(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID orderId
    ) {
        return ApiResponse.ok(commerce.getOrder(principal.id(), orderId));
    }

    @PostMapping("/me/orders/{orderId}/cancel")
    @Operation(summary = "Hủy đơn hàng thanh toán đang chờ")
    public ApiResponse<OrderResponse> cancelOrder(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID orderId
    ) {
        return ApiResponse.ok(commerce.cancelOrder(principal.id(), orderId));
    }

    @GetMapping(value = "/payments/vnpay/ipn", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> vnpayIpn(HttpServletRequest request) {
        Map<String, String> parameters = request.getParameterMap().entrySet().stream()
                .filter(entry -> entry.getValue() != null && entry.getValue().length > 0)
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> Arrays.stream(entry.getValue()).findFirst().orElse("")));
        CommerceService.IpNResult result = commerce.processIpn(parameters);
        return Map.of("RspCode", result.rspCode(), "Message", result.message());
    }
}
