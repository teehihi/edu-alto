package com.edualto.ai.controller;

import com.edualto.ai.dto.AiChatRequest;
import com.edualto.ai.dto.AiChatResponse;
import com.edualto.ai.service.AiChatRateLimitService;
import com.edualto.ai.service.AiChatService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/chat")
public class AiChatController {
    private final AiChatService service;
    private final AiChatRateLimitService limits;

    public AiChatController(AiChatService service, AiChatRateLimitService limits) { this.service = service; this.limits = limits; }

    @PostMapping
    @Operation(summary = "Hỏi Alto Bot: thông tin công khai cho khách, bài học được phân quyền cho thành viên")
    public ApiResponse<AiChatResponse> chat(@AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody AiChatRequest body, HttpServletRequest request) {
        limits.claim(principal == null ? "ip:" + request.getRemoteAddr() : "user:" + principal.id());
        return ApiResponse.ok(service.chat(principal == null ? null : principal.id(), body));
    }
}
