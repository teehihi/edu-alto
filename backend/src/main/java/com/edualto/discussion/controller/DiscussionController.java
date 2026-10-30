package com.edualto.discussion.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.discussion.dto.CreateDiscussionCommentRequest;
import com.edualto.discussion.dto.CreateDiscussionRequest;
import com.edualto.discussion.dto.DiscussionCommentResponse;
import com.edualto.discussion.dto.DiscussionDetailResponse;
import com.edualto.discussion.dto.DiscussionResponse;
import com.edualto.discussion.dto.UpdateDiscussionStatusRequest;
import com.edualto.discussion.service.DiscussionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Lesson Discussions & Q&A", description = "Thảo luận và hỏi đáp bài học")
public class DiscussionController {

    private final DiscussionService service;

    public DiscussionController(DiscussionService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/lessons/{lessonId}/discussions")
    @Operation(summary = "Danh sách câu hỏi thảo luận của bài học")
    public ApiResponse<List<DiscussionResponse>> listLessonDiscussions(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID lessonId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean hasTimestamp
    ) {
        Page<DiscussionResponse> pageResult = service.listLessonDiscussions(
                principal.id(),
                lessonId,
                page,
                size,
                sort,
                search,
                hasTimestamp
        );
        return ApiResponse.page(
                pageResult.getContent(),
                new PageMeta(pageResult.getNumber(), pageResult.getSize(), pageResult.getTotalElements(), pageResult.getTotalPages())
        );
    }

    @PostMapping("/api/v1/lessons/{lessonId}/discussions")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Tạo câu hỏi hoặc chủ đề thảo luận mới cho bài học")
    public ApiResponse<DiscussionResponse> createLessonDiscussion(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID lessonId,
            @Valid @RequestBody CreateDiscussionRequest request
    ) {
        return ApiResponse.ok(service.createDiscussion(principal.id(), lessonId, request));
    }

    @GetMapping("/api/v1/courses/{courseId}/discussions")
    @Operation(summary = "Danh sách tất cả câu hỏi thảo luận trong khóa học")
    public ApiResponse<List<DiscussionResponse>> listCourseDiscussions(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<DiscussionResponse> pageResult = service.listCourseDiscussions(
                principal.id(),
                courseId,
                page,
                size
        );
        return ApiResponse.page(
                pageResult.getContent(),
                new PageMeta(pageResult.getNumber(), pageResult.getSize(), pageResult.getTotalElements(), pageResult.getTotalPages())
        );
    }

    @GetMapping("/api/v1/discussions/{discussionId}")
    @Operation(summary = "Chi tiết câu hỏi thảo luận cùng các câu trả lời")
    public ApiResponse<DiscussionDetailResponse> getDiscussion(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID discussionId
    ) {
        return ApiResponse.ok(service.getDiscussion(principal.id(), discussionId));
    }

    @PostMapping("/api/v1/discussions/{discussionId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Gửi phản hồi / giải đáp cho câu hỏi thảo luận")
    public ApiResponse<DiscussionCommentResponse> addComment(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID discussionId,
            @Valid @RequestBody CreateDiscussionCommentRequest request
    ) {
        return ApiResponse.ok(service.addComment(principal.id(), discussionId, request));
    }

    @DeleteMapping("/api/v1/discussions/{discussionId}")
    @Operation(summary = "Xóa câu hỏi thảo luận")
    public ApiResponse<Void> deleteDiscussion(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID discussionId
    ) {
        service.deleteDiscussion(principal.id(), discussionId);
        return ApiResponse.ok();
    }

    @DeleteMapping("/api/v1/discussions/{discussionId}/comments/{commentId}")
    @Operation(summary = "Xóa bình luận / phản hồi")
    public ApiResponse<Void> deleteComment(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID discussionId,
            @PathVariable UUID commentId
    ) {
        service.deleteComment(principal.id(), discussionId, commentId);
        return ApiResponse.ok();
    }

    @PutMapping("/api/v1/discussions/{discussionId}/status")
    @Operation(summary = "Cập nhật trạng thái câu hỏi (đã giải quyết / mở lại)")
    public ApiResponse<DiscussionResponse> updateStatus(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID discussionId,
            @Valid @RequestBody UpdateDiscussionStatusRequest request
    ) {
        return ApiResponse.ok(service.updateStatus(principal.id(), discussionId, request.status()));
    }
}
