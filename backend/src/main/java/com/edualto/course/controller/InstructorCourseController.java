package com.edualto.course.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.CourseStructureResponse;
import com.edualto.course.dto.CourseThumbnailUploadUrlRequest;
import com.edualto.course.dto.CourseThumbnailUploadUrlResponse;
import com.edualto.course.dto.CreateCourseRequest;
import com.edualto.course.dto.InstructorCourseResponse;
import com.edualto.course.dto.UpdateCourseRequest;
import com.edualto.course.service.CourseService;
import com.edualto.course.service.CourseStructureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor/courses")
@Tag(name = "Instructor Course Management", description = "Quản lý khóa học dành cho giảng viên")
public class InstructorCourseController {

    private final CourseService courseService;
    private final CourseStructureService courseStructureService;

    public InstructorCourseController(
            CourseService courseService,
            CourseStructureService courseStructureService
    ) {
        this.courseService = courseService;
        this.courseStructureService = courseStructureService;
    }

    @PostMapping
    @Operation(summary = "Tạo khóa học mới (Bản nháp - DRAFT)")
    public ApiResponse<InstructorCourseResponse> createCourse(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CreateCourseRequest request
    ) {
        return ApiResponse.ok(courseService.createCourse(principal.id(), request));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách khóa học của giảng viên hiện tại")
    public ApiResponse<List<InstructorCourseResponse>> listInstructorCourses(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) CourseStatus status,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size
    ) {
        Page<InstructorCourseResponse> coursesPage = courseService.getInstructorCourses(
                principal.id(),
                status,
                page,
                size
        );

        PageMeta pageMeta = new PageMeta(
                coursesPage.getNumber(),
                coursesPage.getSize(),
                coursesPage.getTotalElements(),
                coursesPage.getTotalPages()
        );

        return ApiResponse.page(coursesPage.getContent(), pageMeta);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết khóa học của giảng viên")
    public ApiResponse<InstructorCourseResponse> getInstructorCourse(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        return ApiResponse.ok(courseService.getInstructorCourseById(principal.id(), id));
    }

    @GetMapping("/{id}/structure")
    @Operation(summary = "Lấy toàn bộ cấu trúc chương trình (chương & bài học) của khóa học")
    public ApiResponse<CourseStructureResponse> getCourseStructure(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        return ApiResponse.ok(courseStructureService.getCourseStructure(principal.id(), id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin khóa học")
    public ApiResponse<InstructorCourseResponse> updateCourse(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCourseRequest request
    ) {
        return ApiResponse.ok(courseService.updateCourse(principal.id(), id, request));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Xuất bản khóa học (DRAFT -> PUBLISHED)")
    public ApiResponse<InstructorCourseResponse> publishCourse(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        return ApiResponse.ok(courseService.publishCourse(principal.id(), id));
    }

    @PostMapping("/{id}/archive")
    @Operation(summary = "Lưu trữ khóa học (PUBLISHED -> ARCHIVED)")
    public ApiResponse<InstructorCourseResponse> archiveCourse(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id
    ) {
        return ApiResponse.ok(courseService.archiveCourse(principal.id(), id));
    }

    @PostMapping("/thumbnail-upload-url")
    @Operation(summary = "Tạo URL tải lên ảnh thu nhỏ (thumbnail) khóa học")
    public ApiResponse<CourseThumbnailUploadUrlResponse> generateThumbnailUploadUrl(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CourseThumbnailUploadUrlRequest request
    ) {
        return ApiResponse.ok(courseService.generateThumbnailUploadUrl(principal.id(), request));
    }
}

