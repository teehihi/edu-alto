package com.edualto.commerce.controller;

import com.edualto.commerce.dto.AdminOrderResponse;
import com.edualto.commerce.dto.ConfirmManualPaymentRequest;
import com.edualto.commerce.dto.OrderResponse;
import com.edualto.commerce.service.CommerceService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminCommerceController {
    private final CommerceService commerce;

    public AdminCommerceController(CommerceService commerce) {
        this.commerce = commerce;
    }

    @GetMapping("/api/v1/admin/orders")
    @Operation(summary = "Quản trị viên xem đơn hàng")
    public ApiResponse<List<AdminOrderResponse>> listOrders(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status
    ) {
        Page<AdminOrderResponse> result = commerce.listAdminOrders(principal.id(), page, size, status);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }

    @PostMapping("/api/v1/admin/orders/{orderId}/confirm-payment")
    @Operation(summary = "Quản trị viên xác nhận đã đối soát thanh toán thủ công")
    public ApiResponse<OrderResponse> confirmManualPayment(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID orderId,
            @Valid @RequestBody ConfirmManualPaymentRequest request
    ) {
        return ApiResponse.ok(commerce.confirmManualPayment(principal.id(), orderId, request));
    }
}
