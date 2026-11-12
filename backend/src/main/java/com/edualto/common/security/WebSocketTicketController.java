package com.edualto.common.security;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.exception.BusinessException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "WebSocket", description = "Cấp ticket dùng một lần để xác thực kết nối WebSocket")
public class WebSocketTicketController {

    private final WebSocketTicketService ticketService;

    public WebSocketTicketController(WebSocketTicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping("/api/v1/ws/ticket")
    @Operation(summary = "Tạo ticket ngắn hạn dùng một lần cho WebSocket handshake")
    public ApiResponse<WsTicketResponse> issueTicket(@AuthenticationPrincipal AuthenticatedUser principal) {
        if (principal == null) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Vui lòng đăng nhập để tiếp tục");
        }
        String ticket = ticketService.issueTicket(principal);
        return ApiResponse.ok(new WsTicketResponse(ticket, WebSocketTicketService.TICKET_TTL_SECONDS));
    }

    public record WsTicketResponse(String ticket, long expiresInSeconds) {
    }
}
