package com.edualto.certificate.controller;

import com.edualto.certificate.dto.CertificateResponse;
import com.edualto.certificate.service.CertificateService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Certificates", description = "Chứng nhận hoàn thành khóa học")
public class CertificateController {
    private final CertificateService service;

    public CertificateController(CertificateService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/me/certificates")
    @Operation(summary = "Danh sách chứng nhận hoàn thành của học viên hiện tại")
    public ApiResponse<List<CertificateResponse>> myCertificates(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        return ApiResponse.ok(service.getMyCertificates(principal.id()));
    }

    @GetMapping("/api/v1/me/courses/{courseId}/certificate")
    @Operation(summary = "Chứng nhận hoàn thành khóa học của học viên hiện tại")
    public ApiResponse<CertificateResponse> myCourseCertificate(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId
    ) {
        return ApiResponse.ok(service.getMyCourseCertificate(principal.id(), courseId));
    }
}
