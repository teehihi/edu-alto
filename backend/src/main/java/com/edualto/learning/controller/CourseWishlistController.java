package com.edualto.learning.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.learning.dto.FavoriteCourseResponse;
import com.edualto.learning.service.CourseWishlistService;
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
public class CourseWishlistController {
    private final CourseWishlistService service;

    public CourseWishlistController(CourseWishlistService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/me/favorite-courses")
    @Operation(summary = "Xem danh sách khóa học yêu thích")
    public ApiResponse<List<FavoriteCourseResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<FavoriteCourseResponse> result = service.list(principal.id(), page, size);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }

    @PutMapping("/api/v1/me/favorite-courses/{courseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Thêm khóa học vào danh sách yêu thích")
    public void save(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID courseId) {
        service.save(principal.id(), courseId);
    }

    @DeleteMapping("/api/v1/me/favorite-courses/{courseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Bỏ khóa học khỏi danh sách yêu thích")
    public void delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID courseId) {
        service.delete(principal.id(), courseId);
    }
}
