package com.edualto.support.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.support.dto.ContactMessageRequest;
import com.edualto.support.dto.ContactMessageResponse;
import com.edualto.support.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/contact")
@Tag(name = "Support Contact", description = "Tiếp nhận lời nhắn liên hệ công khai")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @PostMapping
    @Operation(summary = "Gửi lời nhắn liên hệ tới đội ngũ hỗ trợ")
    public ResponseEntity<ApiResponse<ContactMessageResponse>> submit(
            @Valid @RequestBody ContactMessageRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = resolveClientIp(httpRequest);
        ContactMessageResponse response = contactService.submit(request, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            int commaIndex = forwardedFor.indexOf(',');
            return commaIndex > 0 ? forwardedFor.substring(0, commaIndex).trim() : forwardedFor.trim();
        }
        return request.getRemoteAddr();
    }
}
