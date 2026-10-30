package com.edualto.notification.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.notification.dto.NotificationResponse;
import com.edualto.notification.dto.NotificationSummaryResponse;
import com.edualto.notification.service.RealtimeNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Realtime Notifications", description = "Hệ thống thông báo đẩy thời gian thực qua WebSocket")
public class RealtimeNotificationController {

    private final RealtimeNotificationService service;

    public RealtimeNotificationController(RealtimeNotificationService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/me/realtime-notifications")
    @Operation(summary = "Danh sách thông báo cá nhân và số lượng chưa xem")
    public ApiResponse<NotificationSummaryResponse> getMyNotifications(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(service.getMyNotifications(principal.id(), page, size));
    }

    @PostMapping("/api/v1/me/realtime-notifications/{id}/read")
    @Operation(summary = "Đánh dấu một thông báo đã đọc")
    public ApiResponse<NotificationResponse> markAsRead(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        return ApiResponse.ok(service.markAsRead(principal.id(), id));
    }

    @PostMapping("/api/v1/me/realtime-notifications/read-all")
    @Operation(summary = "Đánh dấu tất cả thông báo đã đọc")
    public ApiResponse<Integer> markAllAsRead(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(service.markAllAsRead(principal.id()));
    }
}
