package com.edualto.learning.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.learning.dto.SavedLessonResponse;
import com.edualto.learning.service.SavedLessonService;
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
public class SavedLessonController {
    private final SavedLessonService service;

    public SavedLessonController(SavedLessonService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/me/saved-lessons")
    @Operation(summary = "Xem danh sách bài học đã lưu")
    public ApiResponse<List<SavedLessonResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<SavedLessonResponse> result = service.list(principal.id(), page, size);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }

    @PutMapping("/api/v1/me/saved-lessons/{lessonId}")
    @Operation(summary = "Lưu bài học vào danh sách cá nhân")
    public ApiResponse<SavedLessonResponse> save(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID lessonId
    ) {
        return ApiResponse.ok(service.save(principal.id(), lessonId));
    }

    @DeleteMapping("/api/v1/me/saved-lessons/{lessonId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Bỏ lưu bài học")
    public void delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID lessonId) {
        service.delete(principal.id(), lessonId);
    }
}
