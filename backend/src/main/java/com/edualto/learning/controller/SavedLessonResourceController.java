package com.edualto.learning.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.learning.dto.SavedLessonResourceResponse;
import com.edualto.learning.service.SavedLessonResourceService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SavedLessonResourceController {
    private final SavedLessonResourceService service;

    public SavedLessonResourceController(SavedLessonResourceService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/me/saved-resources")
    @Operation(summary = "Xem danh sách tài liệu bài học đã lưu")
    public ApiResponse<List<SavedLessonResourceResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) UUID courseId
    ) {
        Page<SavedLessonResourceResponse> result = service.list(principal.id(), page, size, courseId);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }

    @PutMapping("/api/v1/me/saved-resources/{attachmentId}")
    @Operation(summary = "Lưu tài liệu bài học vào thư viện cá nhân")
    public ApiResponse<SavedLessonResourceResponse> save(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID attachmentId
    ) {
        return ApiResponse.ok(service.save(principal.id(), attachmentId));
    }

    @DeleteMapping("/api/v1/me/saved-resources/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Bỏ lưu tài liệu bài học")
    public void delete(@AuthenticationPrincipal AuthenticatedUser principal,
                       @PathVariable UUID attachmentId) {
        service.delete(principal.id(), attachmentId);
    }
}
