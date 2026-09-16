package com.edualto.course.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.course.dto.CourseSummaryResponse;
import com.edualto.course.service.CourseCatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseController {

    private final CourseCatalogService courseCatalogService;

    public CourseController(CourseCatalogService courseCatalogService) {
        this.courseCatalogService = courseCatalogService;
    }

    @GetMapping
    public ApiResponse<List<CourseSummaryResponse>> listCourses() {
        return ApiResponse.ok(courseCatalogService.getPopularCourses());
    }
}
