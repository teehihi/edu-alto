package com.edualto.ai.controller;

import com.edualto.ai.dto.CourseRecommendationsResponse;
import com.edualto.ai.dto.CourseViewSignalRequest;
import com.edualto.ai.dto.LearningNextRecommendationsResponse;
import com.edualto.ai.dto.LearningPreferencesResponse;
import com.edualto.ai.dto.RecommendationFeedbackRequest;
import com.edualto.ai.dto.UpdateLearningPreferencesRequest;
import com.edualto.ai.service.RecommendationService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Recommendations", description = "Gợi ý khóa học, bài học và sở thích học tập cá nhân hóa")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/recommendations/courses")
    @Operation(summary = "Gợi ý khóa học phù hợp (công khai cho khách và cá nhân hóa cho học viên đã đăng nhập)")
    public ApiResponse<CourseRecommendationsResponse> recommendCourses(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) UUID courseId,
            @RequestParam(defaultValue = "4") int limit
    ) {
        UUID userId = principal != null ? principal.id() : null;
        return ApiResponse.ok(recommendationService.recommendCourses(userId, courseId, limit));
    }

    @GetMapping("/me/recommendations/learning")
    @Operation(summary = "Gợi ý bài học tiếp theo và nội dung cần ôn tập cho học viên")
    public ApiResponse<LearningNextRecommendationsResponse> recommendNextLearning(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ApiResponse.ok(recommendationService.recommendNextLearning(principal.id(), limit));
    }

    @GetMapping("/me/learning-preferences")
    @Operation(summary = "Xem sở thích chủ đề và mục tiêu học tập dùng cho cá nhân hóa")
    public ApiResponse<LearningPreferencesResponse> getLearningPreferences(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(recommendationService.getPreferences(principal.id()));
    }

    @PutMapping("/me/learning-preferences")
    @Operation(summary = "Cập nhật sở thích chủ đề và mục tiêu học tập cá nhân hóa")
    public ApiResponse<LearningPreferencesResponse> updateLearningPreferences(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody UpdateLearningPreferencesRequest request
    ) {
        return ApiResponse.ok(recommendationService.updatePreferences(principal.id(), request));
    }

    @PostMapping("/me/recommendations/feedback")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Ghi nhận phản hồi khi người học tương tác hoặc ẩn một gợi ý")
    public void submitFeedback(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody RecommendationFeedbackRequest request
    ) {
        recommendationService.recordFeedback(principal.id(), request);
    }

    @PostMapping("/me/recommendations/signals/course-view")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Ghi nhận tín hiệu xem khóa học để cải thiện gợi ý")
    public void recordCourseView(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CourseViewSignalRequest request
    ) {
        recommendationService.recordCourseViewSignal(principal.id(), request.courseId());
    }
}
