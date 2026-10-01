package com.edualto.notification.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.notification.domain.NotificationAudience;
import com.edualto.notification.domain.NotificationStatus;
import com.edualto.notification.dto.InstructorNotificationRequest;
import com.edualto.notification.dto.InstructorNotificationResponse;
import com.edualto.notification.service.InstructorNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor/notifications")
@Tag(name = "Instructor Notifications", description = "Quản lý thông báo dành cho học viên")
public class InstructorNotificationController {
    private final InstructorNotificationService notifications;

    public InstructorNotificationController(InstructorNotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    @Operation(summary = "Danh sách thông báo của giảng viên")
    public ApiResponse<List<InstructorNotificationResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(required = false) NotificationAudience audience) {
        Page<InstructorNotificationResponse> result = notifications.list(principal.id(), page, size, status, audience);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }

    @GetMapping("/{notificationId}")
    @Operation(summary = "Chi tiết thông báo")
    public ApiResponse<InstructorNotificationResponse> get(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID notificationId) {
        return ApiResponse.ok(notifications.get(principal.id(), notificationId));
    }

    @PostMapping
    @Operation(summary = "Tạo thông báo nháp")
    public ApiResponse<InstructorNotificationResponse> create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody InstructorNotificationRequest request) {
        return ApiResponse.ok(notifications.create(principal.id(), request));
    }

    @PutMapping("/{notificationId}")
    @Operation(summary = "Cập nhật thông báo nháp")
    public ApiResponse<InstructorNotificationResponse> update(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID notificationId,
            @Valid @RequestBody InstructorNotificationRequest request) {
        return ApiResponse.ok(notifications.update(principal.id(), notificationId, request));
    }

    @PostMapping("/{notificationId}/publish")
    @Operation(summary = "Xuất bản thông báo")
    public ApiResponse<InstructorNotificationResponse> publish(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID notificationId) {
        return ApiResponse.ok(notifications.publish(principal.id(), notificationId));
    }

    @DeleteMapping("/{notificationId}")
    @Operation(summary = "Xóa thông báo")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID notificationId) {
        notifications.delete(principal.id(), notificationId);
        return ApiResponse.ok();
    }

}
