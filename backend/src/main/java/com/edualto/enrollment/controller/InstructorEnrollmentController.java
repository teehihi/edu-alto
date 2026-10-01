package com.edualto.enrollment.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.enrollment.dto.InstructorCourseStudentResponse;
import com.edualto.enrollment.service.EnrollmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor/courses")
@Tag(name = "Instructor Enrollment Management", description = "Danh sách học viên theo khóa học dành cho giảng viên")
public class InstructorEnrollmentController {

    private final EnrollmentService enrollmentService;

    public InstructorEnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @GetMapping("/{courseId}/students")
    @Operation(summary = "Lấy danh sách học viên đã ghi danh khóa học của giảng viên")
    public ApiResponse<List<InstructorCourseStudentResponse>> listCourseStudents(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        Page<InstructorCourseStudentResponse> studentsPage = enrollmentService.getInstructorCourseStudents(
                principal.id(),
                courseId,
                page,
                size,
                search
        );
        PageMeta pageMeta = new PageMeta(
                studentsPage.getNumber(),
                studentsPage.getSize(),
                studentsPage.getTotalElements(),
                studentsPage.getTotalPages()
        );
        return ApiResponse.page(studentsPage.getContent(), pageMeta);
    }
}
