package com.edualto.certificate.service;

import com.edualto.certificate.domain.Certificate;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CertificatePdfGeneratorTest {

    private final QrCodeGenerator qrCodeGenerator = new QrCodeGenerator();
    private final CertificatePdfGenerator pdfGenerator = new CertificatePdfGenerator(qrCodeGenerator);

    @Test
    @DisplayName("Nên sinh file PDF chứng chỉ chuẩn A4 khổ ngang với tem bảo mật chống làm giả và mã xác thực online")
    void shouldGenerateValidCertificatePdfWithSecuritySeal() throws IOException {
        Certificate certificate = new Certificate(
                UUID.randomUUID(),
                "EA-TEST1234567890ABCDEF",
                UUID.randomUUID(),
                "Lập trình Fullstack Web với Next.js và Spring Boot",
                "Phạm Văn Hậu",
                "Nguyễn Văn A",
                Instant.parse("2026-10-28T10:00:00Z")
        );

        String verificationUrl = "http://localhost:3000/certificates/verify/EA-TEST1234567890ABCDEF";

        byte[] pdfBytes = pdfGenerator.generate(certificate, verificationUrl);

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);

        // Verify PDF Header magic bytes (%PDF-)
        String header = new String(pdfBytes, 0, 5);
        assertThat(header).isEqualTo("%PDF-");

        // Verify with PDFBox parser
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            assertThat(document.getNumberOfPages()).isEqualTo(1);

            // A4 Landscape: width ~ 841.89pt, height ~ 595.28pt
            float width = document.getPage(0).getMediaBox().getWidth();
            float height = document.getPage(0).getMediaBox().getHeight();
            assertThat(width).isGreaterThan(height);
            assertThat(Math.round(width)).isEqualTo(842);
            assertThat(Math.round(height)).isEqualTo(595);

            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            // Verify essential content
            assertThat(text).contains("EDUALTO");
            assertThat(text).contains("EA-TEST1234567890ABCDEF");
            assertThat(text).contains("Phạm Văn Hậu");
            assertThat(text).contains("Nguyễn Văn A");

            // Verify Anti-counterfeiting Security Stamp elements
            assertThat(text).contains("TEM BẢO MẬT");
            assertThat(text).contains("CHỐNG LÀM GIẢ");
            assertThat(text).contains("SEC-HASH");
            assertThat(text).contains("EDUALTO VERIFIED");
        }
    }
}
