package com.edualto.assignment.controller;

import com.edualto.assignment.dto.AssignmentResponse;
import com.edualto.assignment.dto.SubmissionRequest;
import com.edualto.assignment.service.AssignmentService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Student Assignments", description = "Xem và nộp bài tập")
public class StudentAssignmentController {
    private final AssignmentService service;

    public StudentAssignmentController(AssignmentService service) { this.service = service; }

    @GetMapping("/api/v1/me/assignments")
    @Operation(summary = "Danh sách bài tập đã xuất bản trong khóa học đã ghi danh")
    public ApiResponse<List<AssignmentResponse>> list(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ApiResponse.ok(service.studentList(principal.id()));
    }

    @PostMapping("/api/v1/assignments/{assignmentId}/submissions")
    @Operation(summary = "Nộp bài tập dạng văn bản")
    public ApiResponse<AssignmentResponse> submit(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID assignmentId, @Valid @RequestBody SubmissionRequest request) {
        return ApiResponse.ok(service.submit(principal.id(), assignmentId, request));
    }

    @PutMapping("/api/v1/assignments/{assignmentId}/submissions/me")
    @Operation(summary = "Cập nhật bài nộp văn bản của bạn")
    public ApiResponse<AssignmentResponse> updateSubmission(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID assignmentId, @Valid @RequestBody SubmissionRequest request) {
        return ApiResponse.ok(service.submit(principal.id(), assignmentId, request));
    }
}
