package com.edualto.ai.controller;

import com.edualto.ai.dto.QuizQuestionGenerationRequest;
import com.edualto.ai.dto.QuizQuestionGenerationResponse;
import com.edualto.ai.service.QuizQuestionGenerationService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/instructor/quiz-question-generations")
@Tag(name = "Instructor Quiz Generation", description = "Tạo bản nháp câu hỏi trắc nghiệm từ nội dung bài học")
public class InstructorQuizQuestionGenerationController {

    private final QuizQuestionGenerationService generations;

    public InstructorQuizQuestionGenerationController(QuizQuestionGenerationService generations) {
        this.generations = generations;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tạo câu hỏi trắc nghiệm từ nguồn bài học đã chọn")
    public ApiResponse<QuizQuestionGenerationResponse> generate(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestPart("request") QuizQuestionGenerationRequest request,
            @RequestPart(value = "sourceFile", required = false) MultipartFile sourceFile
    ) {
        return ApiResponse.ok(generations.generate(principal.id(), request, sourceFile));
    }
}
