package com.edualto.certificate.service;

import com.edualto.certificate.domain.Certificate;
import com.edualto.certificate.dto.CertificateResponse;
import com.edualto.certificate.dto.CertificateVerificationResponse;
import com.edualto.certificate.repository.CertificateRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CertificateService {
    private final CertificateRepository certificates;
    private final UserService users;
    private final CertificatePdfGenerator pdfGenerator;
    private final QrCodeGenerator qrCodeGenerator;
    private final String frontendUrl;

    public CertificateService(
            CertificateRepository certificates,
            UserService users,
            CertificatePdfGenerator pdfGenerator,
            QrCodeGenerator qrCodeGenerator,
            @Value("${edualto.frontend-url:http://localhost:3000}") String frontendUrl
    ) {
        this.certificates = certificates;
        this.users = users;
        this.pdfGenerator = pdfGenerator;
        this.qrCodeGenerator = qrCodeGenerator;
        this.frontendUrl = frontendUrl;
    }

    @Transactional
    public void issueIfEligible(UUID studentId, UUID courseId) {
        users.requireActiveStudent(studentId);
        if (!certificates.lockActiveEnrollment(studentId, courseId)) {
            return;
        }
        certificates.issueIfEligible(studentId, courseId);
    }

    @Transactional
    public List<CertificateResponse> getMyCertificates(UUID studentId) {
        return getMyCertificates(studentId, null);
    }

    @Transactional
    public List<CertificateResponse> getMyCertificates(UUID studentId, String baseUrl) {
        users.requireActiveStudent(studentId);
        for (UUID courseId : certificates.findActiveCourseIds(studentId)) {
            if (certificates.lockActiveEnrollment(studentId, courseId)) {
                certificates.issueIfEligible(studentId, courseId);
            }
        }
        return certificates.findAllByStudentId(studentId).stream()
                .map(cert -> toResponse(cert, baseUrl))
                .toList();
    }

    @Transactional(readOnly = true)
    public CertificateResponse getMyCourseCertificate(UUID studentId, UUID courseId) {
        return getMyCourseCertificate(studentId, courseId, null);
    }

    @Transactional(readOnly = true)
    public CertificateResponse getMyCourseCertificate(UUID studentId, UUID courseId, String baseUrl) {
        users.requireActiveStudent(studentId);
        return certificates.findByStudentIdAndCourseId(studentId, courseId)
                .map(cert -> toResponse(cert, baseUrl))
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "CERTIFICATE_NOT_FOUND",
                        "Bạn chưa được cấp chứng nhận hoàn thành khóa học này"
                ));
    }

    @Transactional(readOnly = true)
    public CertificateVerificationResponse verifyCertificate(String certificateNumber) {
        return verifyCertificate(certificateNumber, null);
    }

    @Transactional(readOnly = true)
    public CertificateVerificationResponse verifyCertificate(String certificateNumber, String baseUrl) {
        Certificate certificate = certificates.findByCertificateNumber(certificateNumber)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "CERTIFICATE_NOT_FOUND",
                        "Không tìm thấy chứng chỉ hoặc mã xác thực không hợp lệ"
                ));
        String verificationUrl = buildVerificationUrl(certificate.certificateNumber(), baseUrl);
        String qrCodeDataUrl = qrCodeGenerator.generateDataUrl(verificationUrl, 200, 200);
        return new CertificateVerificationResponse(
                certificate.certificateNumber(),
                certificate.courseId(),
                certificate.courseTitle(),
                certificate.studentName(),
                certificate.instructorName(),
                certificate.issuedAt(),
                true,
                verificationUrl,
                qrCodeDataUrl
        );
    }

    @Transactional(readOnly = true)
    public byte[] generatePdf(UUID studentId, UUID courseId) {
        return generatePdf(studentId, courseId, null);
    }

    @Transactional(readOnly = true)
    public byte[] generatePdf(UUID studentId, UUID courseId, String baseUrl) {
        users.requireActiveStudent(studentId);
        Certificate certificate = certificates.findByStudentIdAndCourseId(studentId, courseId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "CERTIFICATE_NOT_FOUND",
                        "Bạn chưa được cấp chứng nhận hoàn thành khóa học này"
                ));
        String verificationUrl = buildVerificationUrl(certificate.certificateNumber(), baseUrl);
        return pdfGenerator.generate(certificate, verificationUrl);
    }

    @Transactional(readOnly = true)
    public byte[] generatePublicPdf(String certificateNumber) {
        return generatePublicPdf(certificateNumber, null);
    }

    @Transactional(readOnly = true)
    public byte[] generatePublicPdf(String certificateNumber, String baseUrl) {
        Certificate certificate = certificates.findByCertificateNumber(certificateNumber)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "CERTIFICATE_NOT_FOUND",
                        "Không tìm thấy chứng chỉ hoặc mã xác thực không hợp lệ"
                ));
        String verificationUrl = buildVerificationUrl(certificate.certificateNumber(), baseUrl);
        return pdfGenerator.generate(certificate, verificationUrl);
    }

    @Transactional(readOnly = true)
    public Certificate getCertificateByNumber(String certificateNumber) {
        return certificates.findByCertificateNumber(certificateNumber)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "CERTIFICATE_NOT_FOUND",
                        "Không tìm thấy chứng chỉ hoặc mã xác thực không hợp lệ"
                ));
    }

    private CertificateResponse toResponse(Certificate certificate, String baseUrl) {
        String verificationUrl = buildVerificationUrl(certificate.certificateNumber(), baseUrl);
        String qrCodeDataUrl = qrCodeGenerator.generateDataUrl(verificationUrl, 200, 200);
        return new CertificateResponse(
                certificate.id(),
                certificate.certificateNumber(),
                certificate.courseId(),
                certificate.courseTitle(),
                certificate.studentName(),
                certificate.instructorName(),
                certificate.issuedAt(),
                verificationUrl,
                qrCodeDataUrl
        );
    }

    private String buildVerificationUrl(String certificateNumber, String requestedBaseUrl) {
        String base = null;
        if (requestedBaseUrl != null && !requestedBaseUrl.isBlank()) {
            String trimmed = requestedBaseUrl.trim();
            if (!trimmed.contains("localhost") && !trimmed.contains("127.0.0.1")) {
                base = trimmed;
            }
        }
        if (base == null && frontendUrl != null && !frontendUrl.isBlank()) {
            base = frontendUrl.trim();
        }
        if (base == null || base.isBlank()) {
            base = (requestedBaseUrl != null && !requestedBaseUrl.isBlank()) ? requestedBaseUrl.trim() : "http://localhost:3000";
        }
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/certificates/verify/" + certificateNumber;
    }
}
