package com.edualto.commerce.controller;

import com.edualto.commerce.dto.PromotionRequest;
import com.edualto.commerce.dto.PromotionResponse;
import com.edualto.commerce.dto.PromotionSummaryResponse;
import com.edualto.commerce.service.InstructorPromotionService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor")
public class InstructorPromotionController {
    private final InstructorPromotionService promotions;

    public InstructorPromotionController(InstructorPromotionService promotions) { this.promotions = promotions; }

    @GetMapping("/courses/{courseId}/promotions")
    @Operation(summary = "Danh sách mã khuyến mãi của khóa học")
    public ApiResponse<List<PromotionResponse>> list(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size, @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        Page<PromotionResponse> result = promotions.list(principal.id(), courseId, page, size, search, status);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }

    @PostMapping("/courses/{courseId}/promotions")
    @Operation(summary = "Tạo mã khuyến mãi cho khóa học")
    public ApiResponse<PromotionResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId, @Valid @RequestBody PromotionRequest request) {
        return ApiResponse.ok(promotions.create(principal.id(), courseId, request));
    }

    @PatchMapping("/promotions/{promotionId}")
    @Operation(summary = "Cập nhật mã khuyến mãi")
    public ApiResponse<PromotionResponse> update(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID promotionId, @Valid @RequestBody PromotionRequest request) {
        return ApiResponse.ok(promotions.update(principal.id(), promotionId, request));
    }

    @GetMapping("/courses/{courseId}/promotions/summary")
    @Operation(summary = "Tổng hợp lượt sử dụng mã khuyến mãi")
    public ApiResponse<PromotionSummaryResponse> summary(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId) {
        return ApiResponse.ok(promotions.summary(principal.id(), courseId));
    }
}
