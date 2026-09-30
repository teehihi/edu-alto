package com.edualto.quiz.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.quiz.dto.CreateQuizRequest;
import com.edualto.quiz.dto.QuizAttemptResponse;
import com.edualto.quiz.dto.QuizResponse;
import com.edualto.quiz.dto.SubmitQuizRequest;
import com.edualto.quiz.service.QuizService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Quizzes", description = "Thiết lập và làm bài kiểm tra")
public class QuizController {
    private final QuizService service;

    public QuizController(QuizService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/instructor/lessons/{lessonId}/quiz")
    @Operation(summary = "Tạo bài kiểm tra cho bài học thuộc khóa học của giảng viên")
    public ApiResponse<QuizResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID lessonId, @Valid @RequestBody CreateQuizRequest request) {
        return ApiResponse.ok(service.create(principal.id(), lessonId, request));
    }

    @GetMapping("/api/v1/lessons/{lessonId}/quiz")
    @Operation(summary = "Lấy câu hỏi kiểm tra sau khi ghi danh; không trả về đáp án đúng")
    public ApiResponse<QuizResponse> get(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID lessonId) {
        return ApiResponse.ok(service.getForStudent(principal.id(), lessonId));
    }

    @PostMapping("/api/v1/lessons/{lessonId}/quiz-attempts")
    @Operation(summary = "Nộp câu trả lời và nhận điểm kiểm tra")
    public ApiResponse<QuizAttemptResponse> submit(@AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID lessonId, @Valid @RequestBody SubmitQuizRequest request) {
        return ApiResponse.ok(service.submit(principal.id(), lessonId, request));
    }
}
