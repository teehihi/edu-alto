package com.edualto.messaging.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.messaging.dto.BlockConversationRequest;
import com.edualto.messaging.dto.ConversationResponse;
import com.edualto.messaging.dto.ConversationStartResponse;
import com.edualto.messaging.dto.MessageResponse;
import com.edualto.messaging.dto.SendMessageRequest;
import com.edualto.messaging.service.MessagingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@Tag(name = "Messaging", description = "Tin nhắn trực tiếp giữa học viên và giảng viên")
public class MessagingController {
    private final MessagingService service;

    public MessagingController(MessagingService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/instructor/conversations")
    @Operation(summary = "Danh sách cuộc trò chuyện của giảng viên hiện tại")
    public ApiResponse<List<ConversationResponse>> listInstructorConversations(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return page(service.listInstructorConversations(principal.id(), page, size));
    }

    @GetMapping("/api/v1/me/conversations")
    @Operation(summary = "Danh sách cuộc trò chuyện của học viên hiện tại")
    public ApiResponse<List<ConversationResponse>> listStudentConversations(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return page(service.listStudentConversations(principal.id(), page, size));
    }

    @GetMapping("/api/v1/instructor/conversations/{conversationId}/messages")
    @Operation(summary = "Mở cuộc trò chuyện và đánh dấu tin nhắn đến là đã đọc")
    public ApiResponse<List<MessageResponse>> instructorMessages(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return page(service.openInstructorConversation(principal.id(), conversationId, page, size));
    }

    @GetMapping("/api/v1/me/conversations/{conversationId}/messages")
    @Operation(summary = "Mở cuộc trò chuyện và đánh dấu tin nhắn đến là đã đọc")
    public ApiResponse<List<MessageResponse>> studentMessages(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return page(service.openStudentConversation(principal.id(), conversationId, page, size));
    }

    @PostMapping("/api/v1/instructor/conversations/{conversationId}/messages")
    @Operation(summary = "Giảng viên gửi tin nhắn trong cuộc trò chuyện")
    public ApiResponse<MessageResponse> instructorSendMessage(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return ApiResponse.ok(service.sendInstructorMessage(principal.id(), conversationId, request.body()));
    }

    @PostMapping("/api/v1/me/conversations/{conversationId}/messages")
    @Operation(summary = "Học viên gửi tin nhắn trong cuộc trò chuyện")
    public ApiResponse<MessageResponse> studentSendMessage(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return ApiResponse.ok(service.sendStudentMessage(principal.id(), conversationId, request.body()));
    }

    @PostMapping("/api/v1/me/instructors/{instructorId}/conversations")
    @Operation(summary = "Học viên bắt đầu trò chuyện với giảng viên bằng tin nhắn đầu tiên")
    public ResponseEntity<ApiResponse<ConversationStartResponse>> startConversation(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID instructorId,
            @Valid @RequestBody SendMessageRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(service.startStudentConversation(principal.id(), instructorId, request.body())));
    }

    @PutMapping("/api/v1/instructor/conversations/{conversationId}/block")
    @Operation(summary = "Chặn hoặc bỏ chặn học viên trong cuộc trò chuyện")
    public ApiResponse<Void> setBlocked(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId,
            @Valid @RequestBody BlockConversationRequest request
    ) {
        service.setBlocked(principal.id(), conversationId, request.blocked());
        return ApiResponse.ok();
    }

    @DeleteMapping("/api/v1/instructor/conversations/{conversationId}")
    @Operation(summary = "Ẩn cuộc trò chuyện khỏi danh sách giảng viên")
    public ResponseEntity<Void> hideConversation(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID conversationId
    ) {
        service.hideConversation(principal.id(), conversationId);
        return ResponseEntity.noContent().build();
    }

    private <T> ApiResponse<List<T>> page(Page<T> page) {
        return ApiResponse.page(page.getContent(), new PageMeta(
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()));
    }
}
