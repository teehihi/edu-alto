package com.edualto.course.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.dto.CourseDetailResponse;
import com.edualto.course.dto.CourseListItemResponse;
import com.edualto.course.service.CourseService;
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

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
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
}
