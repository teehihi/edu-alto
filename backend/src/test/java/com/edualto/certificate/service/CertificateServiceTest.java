package com.edualto.certificate.service;

import com.edualto.certificate.domain.Certificate;
import com.edualto.certificate.dto.CertificateVerificationResponse;
import com.edualto.certificate.repository.CertificateRepository;
import com.edualto.learning.service.LearningActivityService;
import com.edualto.user.service.UserService;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CertificateServiceTest {

    @Mock
    private CertificateRepository certificateRepository;

    @Mock
    private UserService userService;

    @Mock
    private CertificatePdfGenerator pdfGenerator;

    @Mock
    private QrCodeGenerator qrCodeGenerator;

    @Mock
    private LearningActivityService learningActivityService;

    private Certificate certificate;
    private CertificateService certificateService;

    @BeforeEach
    void setUp() {
        certificate = new Certificate(
                UUID.randomUUID(),
                "EA-CERT-123456",
                UUID.randomUUID(),
                "Spring Boot Architecture",
                "Nguyen Van A",
                "Tran Thi B",
                Instant.parse("2026-11-01T00:00:00Z")
        );
        certificateService = new CertificateService(
                certificateRepository,
                userService,
                pdfGenerator,
                qrCodeGenerator,
                learningActivityService,
                "https://edualto.vn",
                "https://app.edualto.vn,https://*.wildcard.edualto.vn,http://localhost:3000"
        );
    }

    @Test
    void verifyCertificateIgnoresUntrustedBaseUrlAndUsesConfiguredFrontendUrl() {
        when(certificateRepository.findByCertificateNumber("EA-CERT-123456")).thenReturn(Optional.of(certificate));
        when(qrCodeGenerator.generateDataUrl(anyString(), anyInt(), anyInt())).thenReturn("data:image/png;base64,qr");

        CertificateVerificationResponse response = certificateService.verifyCertificate("EA-CERT-123456", "https://evil.example");

        assertThat(response.verificationUrl()).isEqualTo("https://edualto.vn/certificates/verify/EA-CERT-123456");
        assertThat(response.verificationUrl()).doesNotContain("evil.example");
        verify(qrCodeGenerator).generateDataUrl("https://edualto.vn/certificates/verify/EA-CERT-123456", 200, 200);
    }

    @Test
    void generatePublicPdfRejectsJavascriptSchemeAndFallsBackToConfiguredFrontendUrl() {
        when(certificateRepository.findByCertificateNumber("EA-CERT-123456")).thenReturn(Optional.of(certificate));
        when(pdfGenerator.generate(eq(certificate), anyString())).thenReturn(new byte[]{1, 2, 3});

        byte[] pdf = certificateService.generatePublicPdf("EA-CERT-123456", "javascript:alert(1)");

        assertThat(pdf).containsExactly(1, 2, 3);
        verify(pdfGenerator).generate(certificate, "https://edualto.vn/certificates/verify/EA-CERT-123456");
    }

    @Test
    void verifyCertificateAcceptsAllowlistedCorsOriginAndNormalizesTrailingSlashAndCase() {
        when(certificateRepository.findByCertificateNumber("EA-CERT-123456")).thenReturn(Optional.of(certificate));
        when(qrCodeGenerator.generateDataUrl(anyString(), anyInt(), anyInt())).thenReturn("data:image/png;base64,qr");

        CertificateVerificationResponse response = certificateService.verifyCertificate("EA-CERT-123456", "HTTPS://APP.EDUALTO.VN/");

        assertThat(response.verificationUrl()).isEqualTo("https://app.edualto.vn/certificates/verify/EA-CERT-123456");
    }

    @Test
    void verifyCertificateRejectsUrlsWithUserInfoPathQueryOrFragmentAndWildcardOrigins() {
        when(certificateRepository.findByCertificateNumber("EA-CERT-123456")).thenReturn(Optional.of(certificate));
        when(qrCodeGenerator.generateDataUrl(anyString(), anyInt(), anyInt())).thenReturn("data:image/png;base64,qr");

        for (String suspicious : new String[]{
                "https://app.edualto.vn@evil.example",
                "https://app.edualto.vn/phishing",
                "https://app.edualto.vn?redirect=evil.example",
                "https://app.edualto.vn#evil",
                "https://sub.wildcard.edualto.vn",
                "not a valid uri"
        }) {
            CertificateVerificationResponse response = certificateService.verifyCertificate("EA-CERT-123456", suspicious);
            assertThat(response.verificationUrl()).isEqualTo("https://edualto.vn/certificates/verify/EA-CERT-123456");
        }
    }

    @Test
    void sixArgConstructorFallsBackToLocalhostWhenFrontendUrlIsBlank() {
        CertificateService fallbackService = new CertificateService(
                certificateRepository,
                userService,
                pdfGenerator,
                qrCodeGenerator,
                learningActivityService,
                " "
        );
        when(certificateRepository.findByCertificateNumber("EA-CERT-123456")).thenReturn(Optional.of(certificate));
        when(qrCodeGenerator.generateDataUrl(anyString(), anyInt(), anyInt())).thenReturn("data:image/png;base64,qr");

        CertificateVerificationResponse response = fallbackService.verifyCertificate("EA-CERT-123456", "https://evil.example");

        assertThat(response.verificationUrl()).isEqualTo("http://localhost:3000/certificates/verify/EA-CERT-123456");
    }
}
