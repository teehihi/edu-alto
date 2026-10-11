package com.edualto.ai.controller;

import com.edualto.ai.dto.CurriculumApplyRequest;
import com.edualto.ai.dto.CurriculumApplyResponse;
import com.edualto.ai.dto.CurriculumImportJobResponse;
import com.edualto.ai.service.CurriculumImportService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/instructor/courses/{courseId}/curriculum-imports")
@Tag(name = "Instructor Curriculum Import", description = "Nhập giáo trình từ kế hoạch bài dạy bằng AI")
public class InstructorCurriculumImportController {

    private final CurriculumImportService imports;

    public InstructorCurriculumImportController(CurriculumImportService imports) {
        this.imports = imports;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Tải tài liệu DOC, DOCX hoặc PDF để tạo bản xem trước giáo trình")
    public ApiResponse<CurriculumImportJobResponse> create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @RequestPart("file") MultipartFile file,
            @RequestParam String educationLevel,
            @RequestParam String subject,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String curriculum,
            @RequestParam(defaultValue = "2026-2027") String schoolYear
    ) {
        return ApiResponse.ok(imports.create(principal.id(), courseId, file, educationLevel, subject, grade, curriculum, schoolYear));
    }

    @GetMapping("/{jobId}")
    @Operation(summary = "Theo dõi trạng thái phân tích và xem trước giáo trình")
    public ApiResponse<CurriculumImportJobResponse> get(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID jobId
    ) {
        return ApiResponse.ok(imports.get(principal.id(), courseId, jobId));
    }

    @PostMapping("/{jobId}/apply")
    @Operation(summary = "Thêm giáo trình đã duyệt vào khóa học dưới dạng bản nháp")
    public ApiResponse<CurriculumApplyResponse> apply(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @PathVariable UUID jobId,
            @Valid @RequestBody CurriculumApplyRequest request
    ) {
        return ApiResponse.ok(imports.apply(principal.id(), courseId, jobId, request));
    }
}
