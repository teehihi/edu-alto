package com.edualto.course.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.course.dto.CreateLessonRequest;
import com.edualto.course.dto.LessonResponse;
import com.edualto.course.dto.ReorderLessonsRequest;
import com.edualto.course.dto.UpdateLessonRequest;
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
@RequestMapping("/api/v1/instructor/courses/{courseId}/sections/{sectionId}/lessons")
@Tag(name = "Instructor Lesson Management", description = "Quản lý bài học của chương học dành cho giảng viên")
public class InstructorLessonController {

    private final CourseStructureService courseStructureService;

    public InstructorLessonController(CourseStructureService courseStructureService) {
        this.courseStructureService = courseStructureService;
    }

    @PostMapping
    @Operation(summary = "Tạo bài học mới trong chương học")
    public ApiResponse<LessonResponse> createLesson(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody CreateLessonRequest request
    ) {
        return ApiResponse.ok(courseStructureService.createLesson(principal.id(), courseId, sectionId, request));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách bài học của chương học")
    public ApiResponse<List<LessonResponse>> listLessons(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId
    ) {
        return ApiResponse.ok(courseStructureService.getLessons(principal.id(), courseId, sectionId));
    }

    @GetMapping("/{lessonId}")
    @Operation(summary = "Lấy thông tin chi tiết một bài học")
    public ApiResponse<LessonResponse> getLesson(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @PathVariable UUID lessonId
    ) {
        return ApiResponse.ok(courseStructureService.getLessonById(principal.id(), courseId, sectionId, lessonId));
    }

    @PutMapping("/{lessonId}")
    @Operation(summary = "Cập nhật thông tin bài học")
    public ApiResponse<LessonResponse> updateLesson(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @PathVariable UUID lessonId,
            @Valid @RequestBody UpdateLessonRequest request
    ) {
        return ApiResponse.ok(courseStructureService.updateLesson(principal.id(), courseId, sectionId, lessonId, request));
    }

    @DeleteMapping("/{lessonId}")
    @Operation(summary = "Xóa một bài học")
    public ApiResponse<Void> deleteLesson(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @PathVariable UUID lessonId
    ) {
        courseStructureService.deleteLesson(principal.id(), courseId, sectionId, lessonId);
        return ApiResponse.ok();
    }

    @PutMapping("/reorder")
    @Operation(summary = "Sắp xếp lại thứ tự các bài học trong chương")
    public ApiResponse<List<LessonResponse>> reorderLessons(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody ReorderLessonsRequest request
    ) {
        return ApiResponse.ok(courseStructureService.reorderLessons(principal.id(), courseId, sectionId, request));
    }
}
