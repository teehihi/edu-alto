package com.edualto.ai.controller;

import com.edualto.ai.service.EducationPolicyService;
import com.edualto.ai.service.EducationPolicyService.PolicyResponse;
import com.edualto.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/education-policy")
public class EducationPolicyController {
    private final EducationPolicyService service;

    public EducationPolicyController(EducationPolicyService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "Tra nguồn chương trình, đánh giá và sách theo cấp học/môn/lớp/năm học")
    public ApiResponse<PolicyResponse> get(
            @RequestParam String educationLevel,
            @RequestParam(defaultValue = "") String subject,
            @RequestParam(defaultValue = "") String grade,
            @RequestParam(defaultValue = "2026-2027") String schoolYear
    ) {
        return ApiResponse.ok(service.select(educationLevel, subject, grade, schoolYear));
    }
}
