package com.edualto.learning.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.learning.dto.LearningNoteRequest;
import com.edualto.learning.dto.LearningNoteResponse;
import com.edualto.learning.service.LearningNoteService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LearningNoteController {
    private final LearningNoteService service;

    public LearningNoteController(LearningNoteService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/me/notes")
    @Operation(summary = "Xem ghi chú của học viên đang đăng nhập")
    public ApiResponse<List<LearningNoteResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<LearningNoteResponse> result = service.list(principal.id(), page, size);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }

    @PostMapping("/api/v1/me/notes")
    @Operation(summary = "Tạo ghi chú cá nhân")
    public ApiResponse<LearningNoteResponse> create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody LearningNoteRequest request
    ) {
        return ApiResponse.ok(service.create(principal.id(), request));
    }

    @PutMapping("/api/v1/me/notes/{noteId}")
    @Operation(summary = "Cập nhật ghi chú của bạn")
    public ApiResponse<LearningNoteResponse> update(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID noteId,
            @Valid @RequestBody LearningNoteRequest request
    ) {
        return ApiResponse.ok(service.update(principal.id(), noteId, request));
    }

    @DeleteMapping("/api/v1/me/notes/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Xóa ghi chú của bạn")
    public void delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID noteId) {
        service.delete(principal.id(), noteId);
    }
}
