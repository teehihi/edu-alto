package com.edualto.course.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.dto.CourseDetailResponse;
import com.edualto.course.dto.CourseCurriculumResponse;
import com.edualto.course.dto.CourseLessonPreviewResponse;
import com.edualto.course.dto.CourseListItemResponse;
import com.edualto.course.service.CourseService;
import com.edualto.course.service.PublicCourseCurriculumService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/courses")
@Tag(name = "Course Catalog", description = "Danh mục khóa học công khai cho học viên và khách vãng lai")
public class CourseController {

    private final CourseService courseService;
    private final PublicCourseCurriculumService curriculumService;

    public CourseController(CourseService courseService, PublicCourseCurriculumService curriculumService) {
        this.courseService = courseService;
        this.curriculumService = curriculumService;
    }

    @GetMapping
    @Operation(summary = "Tìm kiếm & lọc danh mục khóa học đã xuất bản")
    public ApiResponse<List<CourseListItemResponse>> listCourses(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) CourseLevel level,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean isFree,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) UUID instructorId,
            @RequestParam(required = false, defaultValue = "newest") String sort,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "12") int size
    ) {
        Page<CourseListItemResponse> coursesPage = courseService.getPublicCatalog(
                keyword,
                level,
                minPrice,
                maxPrice,
                isFree,
                language,
                instructorId,
                sort,
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

    @GetMapping("/{slug}")
    @Operation(summary = "Xem thông tin chi tiết khóa học bằng slug")
    public ApiResponse<CourseDetailResponse> getCourseBySlug(@PathVariable String slug) {
        return ApiResponse.ok(courseService.getPublicCourseBySlug(slug));
    }

    @GetMapping("/{slug}/curriculum")
    @Operation(summary = "Xem giáo trình công khai của khóa học")
    public ApiResponse<CourseCurriculumResponse> getCurriculum(@PathVariable String slug) {
        return ApiResponse.ok(curriculumService.getCurriculum(slug));
    }

    @GetMapping("/{slug}/lessons/{lessonId}/preview")
    @Operation(summary = "Xem trước bài học văn bản miễn phí")
    public ApiResponse<CourseLessonPreviewResponse> getTextPreview(
            @PathVariable String slug,
            @PathVariable UUID lessonId
    ) {
        return ApiResponse.ok(curriculumService.getTextPreview(slug, lessonId));
    }
}
