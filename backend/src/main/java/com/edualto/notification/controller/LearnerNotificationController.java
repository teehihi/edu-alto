package com.edualto.notification.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.notification.dto.LearnerNotificationResponse;
import com.edualto.notification.service.LearnerNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Learner Notifications", description = "Thông báo dành cho học viên")
public class LearnerNotificationController {
    private final LearnerNotificationService notifications;

    public LearnerNotificationController(LearnerNotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping("/api/v1/me/notifications")
    @Operation(summary = "Danh sách thông báo hợp nhất dành cho học viên")
    public ApiResponse<List<LearnerNotificationResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LearnerNotificationResponse> result = notifications.list(principal.id(), page, size);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }
}
