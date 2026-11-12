package com.edualto.certificate.service;

import com.edualto.certificate.domain.Certificate;
import com.edualto.certificate.dto.CertificateResponse;
import com.edualto.certificate.dto.CertificateVerificationResponse;
import com.edualto.certificate.repository.CertificateRepository;
import com.edualto.certificate.repository.CertificateRepository.IssueResult;
import com.edualto.common.exception.BusinessException;
import com.edualto.learning.domain.LearningActivityType;
import com.edualto.learning.service.LearningActivityService;
import com.edualto.user.service.UserService;
import java.net.URI;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final LearningActivityService learningActivities;
    private final String frontendUrl;
    private final Set<String> allowedBaseOrigins;

    public CertificateService(
            CertificateRepository certificates,
            UserService users,
            CertificatePdfGenerator pdfGenerator,
            QrCodeGenerator qrCodeGenerator,
            LearningActivityService learningActivities,
            @Value("${edualto.frontend-url:http://localhost:3000}") String frontendUrl
    ) {
        this(certificates, users, pdfGenerator, qrCodeGenerator, learningActivities, frontendUrl, "");
    }

    @Autowired
    public CertificateService(
            CertificateRepository certificates,
            UserService users,
            CertificatePdfGenerator pdfGenerator,
            QrCodeGenerator qrCodeGenerator,
            LearningActivityService learningActivities,
            @Value("${edualto.frontend-url:http://localhost:3000}") String frontendUrl,
            @Value("${edualto.cors.allowed-origins:http://localhost:3000}") String allowedOriginsCsv
    ) {
        this.certificates = certificates;
        this.users = users;
        this.pdfGenerator = pdfGenerator;
        this.qrCodeGenerator = qrCodeGenerator;
        this.learningActivities = learningActivities;
        this.frontendUrl = frontendUrl;
        this.allowedBaseOrigins = buildAllowedBaseOrigins(frontendUrl, allowedOriginsCsv);
    }

    @Transactional
    public void issueIfEligible(UUID studentId, UUID courseId) {
        users.requireActiveStudent(studentId);
        if (!certificates.lockActiveEnrollment(studentId, courseId)) {
            return;
        }
        issueAndTrack(studentId, courseId);
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
                issueAndTrack(studentId, courseId);
            }
        }
        return certificates.findAllByStudentId(studentId).stream()
                .map(cert -> toResponse(cert, baseUrl))
                .toList();
    }

    private void issueAndTrack(UUID studentId, UUID courseId) {
        certificates.issueIfEligibleWithStatus(studentId, courseId)
                .filter(IssueResult::newlyIssued)
                .ifPresent(result -> {
                    Certificate cert = result.certificate();
                    String metadata = String.format(
                            Locale.ROOT,
                            "{\"certificateNumber\":\"%s\"}",
                            cert.certificateNumber()
                    );
                    learningActivities.recordActivityDirect(
                            studentId,
                            courseId,
                            null,
                            null,
                            LearningActivityType.CERTIFICATE_ISSUED,
                            cert.id(),
                            cert.issuedAt(),
                            metadata
                    );
                });
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
        String normalizedRequested = normalizeOrigin(requestedBaseUrl);
        String base;
        if (normalizedRequested != null && allowedBaseOrigins.contains(normalizedRequested)) {
            base = normalizedRequested;
        } else if (frontendUrl != null && !frontendUrl.isBlank()) {
            base = frontendUrl.trim();
        } else {
            base = "http://localhost:3000";
        }
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/certificates/verify/" + certificateNumber;
    }

    private static Set<String> buildAllowedBaseOrigins(String frontendUrl, String allowedOriginsCsv) {
        Set<String> origins = new LinkedHashSet<>();
        String normalizedFrontend = normalizeOrigin(frontendUrl);
        if (normalizedFrontend != null) {
            origins.add(normalizedFrontend);
        }
        if (allowedOriginsCsv != null && !allowedOriginsCsv.isBlank()) {
            for (String entry : allowedOriginsCsv.split(",")) {
                String trimmed = entry.trim();
                if (trimmed.isEmpty() || trimmed.contains("*")) {
                    continue;
                }
                String normalizedEntry = normalizeOrigin(trimmed);
                if (normalizedEntry != null) {
                    origins.add(normalizedEntry);
                }
            }
        }
        return Set.copyOf(origins);
    }

    private static String normalizeOrigin(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return null;
        }
        URI uri;
        try {
            uri = URI.create(rawUrl.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || host == null || host.isBlank()) {
            return null;
        }
        String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
        if (!"http".equals(normalizedScheme) && !"https".equals(normalizedScheme)) {
            return null;
        }
        if (uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) {
            return null;
        }
        String path = uri.getRawPath();
        if (path != null && !path.isEmpty() && !"/".equals(path)) {
            return null;
        }
        String normalizedHost = host.toLowerCase(Locale.ROOT);
        int port = uri.getPort();
        return port != -1
                ? normalizedScheme + "://" + normalizedHost + ":" + port
                : normalizedScheme + "://" + normalizedHost;
    }
}
