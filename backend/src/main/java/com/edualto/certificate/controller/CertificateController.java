package com.edualto.certificate.controller;

import com.edualto.certificate.domain.Certificate;
import com.edualto.certificate.dto.CertificateResponse;
import com.edualto.certificate.dto.CertificateVerificationResponse;
import com.edualto.certificate.service.CertificateService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
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
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) String baseUrl
    ) {
        return ApiResponse.ok(service.getMyCertificates(principal.id(), baseUrl));
    }

    @GetMapping("/api/v1/me/courses/{courseId}/certificate")
    @Operation(summary = "Chứng nhận hoàn thành khóa học của học viên hiện tại")
    public ApiResponse<CertificateResponse> myCourseCertificate(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @RequestParam(required = false) String baseUrl
    ) {
        return ApiResponse.ok(service.getMyCourseCertificate(principal.id(), courseId, baseUrl));
    }

    @GetMapping("/api/v1/me/courses/{courseId}/certificate/pdf")
    @Operation(summary = "Tải file PDF chứng nhận của học viên hiện tại")
    public ResponseEntity<byte[]> downloadMyCourseCertificatePdf(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID courseId,
            @RequestParam(required = false) String baseUrl
    ) {
        CertificateResponse cert = service.getMyCourseCertificate(principal.id(), courseId, baseUrl);
        byte[] pdfBytes = service.generatePdf(principal.id(), courseId, baseUrl);
        String filename = "certificate-" + cert.certificateNumber() + ".pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename, StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .body(pdfBytes);
    }

    @GetMapping("/api/v1/certificates/verify/{certificateNumber}")
    @Operation(summary = "Xác thực công khai chứng nhận bằng mã chứng chỉ")
    public ApiResponse<CertificateVerificationResponse> verifyCertificate(
            @PathVariable String certificateNumber,
            @RequestParam(required = false) String baseUrl
    ) {
        return ApiResponse.ok(service.verifyCertificate(certificateNumber, baseUrl));
    }

    @GetMapping("/api/v1/certificates/{certificateNumber}/pdf")
    @Operation(summary = "Tải file PDF chứng nhận công khai qua mã chứng chỉ")
    public ResponseEntity<byte[]> downloadPublicCertificatePdf(
            @PathVariable String certificateNumber,
            @RequestParam(required = false) String baseUrl
    ) {
        Certificate cert = service.getCertificateByNumber(certificateNumber);
        byte[] pdfBytes = service.generatePublicPdf(certificateNumber, baseUrl);
        String filename = "certificate-" + cert.certificateNumber() + ".pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename, StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .body(pdfBytes);
    }
}
