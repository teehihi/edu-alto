package com.edualto.review.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.review.dto.CourseReviewRequest;
import com.edualto.review.dto.CourseReviewResponse;
import com.edualto.review.dto.CourseReviewSummaryResponse;
import com.edualto.review.dto.InstructorReviewReplyRequest;
import com.edualto.review.dto.InstructorReviewSummaryResponse;
import com.edualto.review.dto.ReviewVisibilityRequest;
import com.edualto.review.service.CourseReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Course Reviews", description = "Đánh giá khóa học")
public class CourseReviewController {
    private final CourseReviewService service;

    public CourseReviewController(CourseReviewService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/courses/{courseId}/reviews")
    @Operation(summary = "Danh sách đánh giá đã công khai của khóa học")
    public ApiResponse<List<CourseReviewResponse>> list(
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<CourseReviewResponse> reviews = service.listPublished(courseId, page, size);
        return ApiResponse.page(
                reviews.getContent(),
                new PageMeta(reviews.getNumber(), reviews.getSize(), reviews.getTotalElements(), reviews.getTotalPages())
        );
    }

    @GetMapping("/api/v1/instructor/courses/{courseId}/reviews")
    @Operation(summary = "Danh sách đánh giá của khóa học do giảng viên sở hữu")
    public ApiResponse<List<CourseReviewResponse>> instructorReviews(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String status
    ) {
        Page<CourseReviewResponse> reviews = service.listInstructorReviews(principal.id(), courseId, page, size, status);
        return ApiResponse.page(
                reviews.getContent(),
                new PageMeta(reviews.getNumber(), reviews.getSize(), reviews.getTotalElements(), reviews.getTotalPages())
        );
    }

    @GetMapping("/api/v1/courses/{courseId}/reviews/summary")
    @Operation(summary = "Điểm trung bình và số lượng đánh giá đã công khai")
    public ApiResponse<CourseReviewSummaryResponse> summary(@PathVariable UUID courseId) {
        return ApiResponse.ok(service.getSummary(courseId));
    }

    @GetMapping("/api/v1/instructor/reviews/summary")
    @Operation(summary = "Thống kê đánh giá của các khóa học do giảng viên sở hữu")
    public ApiResponse<InstructorReviewSummaryResponse> instructorSummary(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(service.getInstructorSummary(principal.id()));
    }

    @PutMapping("/api/v1/me/courses/{courseId}/review")
    @Operation(summary = "Tạo hoặc cập nhật đánh giá của học viên đã ghi danh")
    public ApiResponse<CourseReviewResponse> upsertOwnReview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @Valid @RequestBody CourseReviewRequest request
    ) {
        return ApiResponse.ok(service.upsertOwnReview(principal.id(), courseId, request));
    }

    @PutMapping("/api/v1/instructor/courses/{courseId}/reviews/{reviewId}/visibility")
    @Operation(summary = "Ẩn hoặc công khai đánh giá của khóa học do giảng viên sở hữu")
    public ApiResponse<CourseReviewResponse> setVisibility(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID reviewId,
            @Valid @RequestBody ReviewVisibilityRequest request
    ) {
        return ApiResponse.ok(service.setVisibility(principal.id(), courseId, reviewId, request.published()));
    }

    @PutMapping("/api/v1/instructor/courses/{courseId}/reviews/{reviewId}/reply")
    @Operation(summary = "Tạo hoặc cập nhật phản hồi của giảng viên cho đánh giá")
    public ApiResponse<CourseReviewResponse> replyToReview(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID reviewId,
            @Valid @RequestBody InstructorReviewReplyRequest request
    ) {
        return ApiResponse.ok(service.replyToReview(principal.id(), courseId, reviewId, request));
    }

    @DeleteMapping("/api/v1/instructor/courses/{courseId}/reviews/{reviewId}/reply")
    @Operation(summary = "Xóa phản hồi của giảng viên khỏi đánh giá")
    public ApiResponse<CourseReviewResponse> deleteInstructorReply(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID reviewId
    ) {
        return ApiResponse.ok(service.deleteInstructorReply(principal.id(), courseId, reviewId));
    }
}
