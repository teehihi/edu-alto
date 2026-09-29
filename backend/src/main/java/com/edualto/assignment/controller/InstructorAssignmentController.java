package com.edualto.assignment.controller;

import com.edualto.assignment.dto.AssignmentRequest;
import com.edualto.assignment.dto.AssignmentResponse;
import com.edualto.assignment.dto.GradeRequest;
import com.edualto.assignment.dto.SubmissionResponse;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Instructor Assignments", description = "Quản lý bài tập và chấm bài")
public class InstructorAssignmentController {
    private final AssignmentService service;

    public InstructorAssignmentController(AssignmentService service) { this.service = service; }

    @GetMapping("/api/v1/instructor/courses/{courseId}/assignments")
    @Operation(summary = "Danh sách bài tập của khóa học")
    public ApiResponse<List<AssignmentResponse>> list(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId) {
        return ApiResponse.ok(service.instructorList(principal.id(), courseId));
    }

    @PostMapping("/api/v1/instructor/courses/{courseId}/assignments")
    @Operation(summary = "Tạo bài tập nháp cho khóa học")
    public ApiResponse<AssignmentResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId, @Valid @RequestBody AssignmentRequest request) {
        return ApiResponse.ok(service.create(principal.id(), courseId, request));
    }

    @PutMapping("/api/v1/instructor/assignments/{assignmentId}")
    @Operation(summary = "Cập nhật bài tập")
    public ApiResponse<AssignmentResponse> update(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID assignmentId, @Valid @RequestBody AssignmentRequest request) {
        return ApiResponse.ok(service.update(principal.id(), assignmentId, request));
    }

    @PostMapping("/api/v1/instructor/assignments/{assignmentId}/publish")
    @Operation(summary = "Xuất bản bài tập")
    public ApiResponse<AssignmentResponse> publish(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID assignmentId) {
        return ApiResponse.ok(service.publish(principal.id(), assignmentId));
    }

    @PostMapping("/api/v1/instructor/assignments/{assignmentId}/archive")
    @Operation(summary = "Lưu trữ bài tập")
    public ApiResponse<AssignmentResponse> archive(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID assignmentId) {
        return ApiResponse.ok(service.archive(principal.id(), assignmentId));
    }

    @GetMapping("/api/v1/instructor/assignments/{assignmentId}/submissions")
    @Operation(summary = "Danh sách bài nộp của bài tập")
    public ApiResponse<List<SubmissionResponse>> submissions(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID assignmentId) {
        return ApiResponse.ok(service.listSubmissions(principal.id(), assignmentId));
    }

    @PutMapping("/api/v1/instructor/assignments/{assignmentId}/submissions/{submissionId}/grade")
    @Operation(summary = "Chấm điểm và gửi nhận xét")
    public ApiResponse<SubmissionResponse> grade(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID assignmentId, @PathVariable UUID submissionId,
            @Valid @RequestBody GradeRequest request) {
        return ApiResponse.ok(service.grade(principal.id(), assignmentId, submissionId, request));
    }
}
