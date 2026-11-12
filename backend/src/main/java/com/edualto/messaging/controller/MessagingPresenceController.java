package com.edualto.messaging.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.messaging.service.MessagingPresenceService;
import com.edualto.messaging.service.MessagingPresenceService.PresenceStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Messaging Presence", description = "Trạng thái trực tuyến của người dùng trong tin nhắn")
public class MessagingPresenceController {

    private final MessagingPresenceService presenceService;

    public MessagingPresenceController(MessagingPresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @GetMapping("/api/v1/me/presence")
    @Operation(summary = "Kiểm tra trạng thái trực tuyến hiện tại của danh sách người dùng")
    public ApiResponse<List<PresenceStatusResponse>> getPresence(
            @RequestParam(name = "userIds", required = false) List<UUID> userIds
    ) {
        return ApiResponse.ok(presenceService.getPresenceStatuses(userIds));
    }
}
