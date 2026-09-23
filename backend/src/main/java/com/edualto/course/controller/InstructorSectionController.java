package com.edualto.course.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.course.dto.CreateSectionRequest;
import com.edualto.course.dto.ReorderSectionsRequest;
import com.edualto.course.dto.SectionResponse;
import com.edualto.course.dto.UpdateSectionRequest;
import com.edualto.course.service.CourseStructureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/instructor/courses/{courseId}/sections")
@Tag(name = "Instructor Section Management", description = "Quản lý chương học của khóa học dành cho giảng viên")
public class InstructorSectionController {

    private final CourseStructureService courseStructureService;

    public InstructorSectionController(CourseStructureService courseStructureService) {
        this.courseStructureService = courseStructureService;
    }

    @PostMapping
    @Operation(summary = "Tạo chương học mới trong khóa học")
    public ApiResponse<SectionResponse> createSection(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @Valid @RequestBody CreateSectionRequest request
    ) {
        return ApiResponse.ok(courseStructureService.createSection(principal.id(), courseId, request));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả chương học của khóa học")
    public ApiResponse<List<SectionResponse>> listSections(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId
    ) {
        return ApiResponse.ok(courseStructureService.getSections(principal.id(), courseId));
    }

    @GetMapping("/{sectionId}")
    @Operation(summary = "Lấy thông tin chi tiết một chương học")
    public ApiResponse<SectionResponse> getSection(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId
    ) {
        return ApiResponse.ok(courseStructureService.getSectionById(principal.id(), courseId, sectionId));
    }

    @PutMapping("/{sectionId}")
    @Operation(summary = "Cập nhật thông tin chương học")
    public ApiResponse<SectionResponse> updateSection(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody UpdateSectionRequest request
    ) {
        return ApiResponse.ok(courseStructureService.updateSection(principal.id(), courseId, sectionId, request));
    }

    @DeleteMapping("/{sectionId}")
    @Operation(summary = "Xóa một chương học và các bài học liên quan")
    public ApiResponse<Void> deleteSection(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId
    ) {
        courseStructureService.deleteSection(principal.id(), courseId, sectionId);
        return ApiResponse.ok();
    }

    @PutMapping("/reorder")
    @Operation(summary = "Sắp xếp lại thứ tự các chương học")
    public ApiResponse<List<SectionResponse>> reorderSections(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @Valid @RequestBody ReorderSectionsRequest request
    ) {
        return ApiResponse.ok(courseStructureService.reorderSections(principal.id(), courseId, request));
    }
}
