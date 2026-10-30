package com.edualto.certificate.service;

import com.edualto.certificate.domain.Certificate;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Component;

@Component
public class CertificatePdfGenerator {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private static final Color COLOR_PRIMARY = new Color(32, 180, 134);         // #20B486
    private static final Color COLOR_PRIMARY_DARK = new Color(21, 158, 117);    // #159E75
    private static final Color COLOR_HEADING = new Color(16, 26, 44);           // #101A2C
    private static final Color COLOR_MUTED = new Color(102, 112, 133);          // #667085
    private static final Color COLOR_BORDER_LIGHT = new Color(221, 239, 233);   // #DDEFE9
    private static final Color COLOR_DIVIDER = new Color(226, 232, 240);        // #E2E8F0
    private static final Color COLOR_GOLD = new Color(212, 175, 55);            // #D4AF37
    private static final Color COLOR_GOLD_DARK = new Color(160, 128, 40);       // #A08028
    private static final Color COLOR_GOLD_LIGHT = new Color(250, 246, 230);     // #FAF6E6
    private static final Color COLOR_SEAL_BG = new Color(246, 252, 249);        // #F6FCF9
    private static final Color COLOR_WATERMARK = new Color(243, 249, 246);      // #F3F9F6

    private final QrCodeGenerator qrCodeGenerator;

    public CertificatePdfGenerator(QrCodeGenerator qrCodeGenerator) {
        this.qrCodeGenerator = qrCodeGenerator;
    }

    public byte[] generate(Certificate certificate, String verificationUrl) {
        try (PDDocument document = new PDDocument()) {
            PDRectangle landscapeA4 = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            PDPage page = new PDPage(landscapeA4);
            document.addPage(page);

            float pageWidth = landscapeA4.getWidth();
            float pageHeight = landscapeA4.getHeight();

            PDFont regularFont = loadFont(document, "/fonts/Roboto-Regular.ttf", Standard14Fonts.FontName.HELVETICA);
            PDFont boldFont = loadFont(document, "/fonts/Roboto-Bold.ttf", Standard14Fonts.FontName.HELVETICA_BOLD);

            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                // 1. Background fill
                stream.setNonStrokingColor(new Color(254, 255, 254));
                stream.addRect(0, 0, pageWidth, pageHeight);
                stream.fill();

                // 2. Guilloche Security Wave Lines (Anti-counterfeit subtle pattern)
                drawGuillochePattern(stream, pageWidth, pageHeight);

                // 3. Central Security Watermark
                drawWatermark(stream, boldFont, pageWidth, pageHeight);

                // 4. Multi-layer Borders & Corner Brackets
                drawDecorativeBorders(stream, regularFont, pageWidth, pageHeight);

                // 5. Header: Platform Brand Logo
                drawHeaderLogo(stream, document, boldFont, regularFont, pageWidth);

                // 6. Certificate Title
                drawCenteredText(stream, boldFont, 27, "CHỨNG NHẬN HOÀN THÀNH", 450, pageWidth, COLOR_HEADING);
                drawCenteredText(stream, regularFont, 11.5f, "Chứng nhận rằng", 425, pageWidth, COLOR_MUTED);

                // 7. Student Name with Elegant Accent Underline
                String studentName = certificate.studentName();
                drawCenteredText(stream, boldFont, 25, studentName, 384, pageWidth, COLOR_PRIMARY_DARK);

                float studentWidth = Math.min(boldFont.getStringWidth(sanitizeText(studentName, boldFont)) / 1000f * 25 + 48, pageWidth - 200);
                float lineStartX = (pageWidth - studentWidth) / 2f;
                stream.setStrokingColor(COLOR_PRIMARY);
                stream.setLineWidth(1.5f);
                stream.moveTo(lineStartX, 372);
                stream.lineTo(lineStartX + studentWidth, 372);
                stream.stroke();

                // Small center diamond on underline
                drawDiamond(stream, pageWidth / 2f, 372, 3.5f, COLOR_GOLD);

                // 8. Completion Text
                drawCenteredText(stream, regularFont, 11.5f, "đã hoàn thành xuất sắc toàn bộ nội dung xuất bản của khóa học", 348, pageWidth, COLOR_MUTED);

                // 9. Course Title
                String courseTitle = fitText(certificate.courseTitle(), boldFont, 19, pageWidth - 160);
                drawCenteredText(stream, boldFont, 19, courseTitle, 314, pageWidth, COLOR_HEADING);

                // 10. Instructor
                String instructorText = "Giảng viên hướng dẫn: " + certificate.instructorName();
                drawCenteredText(stream, regularFont, 11, instructorText, 284, pageWidth, COLOR_MUTED);

                // 11. Divider Line
                stream.setStrokingColor(COLOR_DIVIDER);
                stream.setLineWidth(0.75f);
                stream.moveTo(56, 248);
                stream.lineTo(pageWidth - 56, 248);
                stream.stroke();

                // Center diamond on divider
                drawDiamond(stream, pageWidth / 2f, 248, 3.0f, COLOR_PRIMARY);

                // 12. Bottom Left Column: Issuance Date, Verification Number & Integrity Hash
                String issueDate = DATE_FORMATTER.format(certificate.issuedAt());
                String securityHash = computeSecurityHash(certificate.certificateNumber(), certificate.studentName(), certificate.courseTitle(), issueDate);

                drawText(stream, regularFont, 8.5f, "NGÀY CẤP CHỨNG NHẬN", 64, 218, COLOR_MUTED);
                drawText(stream, boldFont, 11, issueDate, 64, 202, COLOR_HEADING);

                drawText(stream, regularFont, 8.5f, "MÃ XÁC THỰC ĐIỆN TỬ", 64, 162, COLOR_MUTED);
                drawText(stream, boldFont, 11, certificate.certificateNumber(), 64, 146, COLOR_PRIMARY_DARK);

                drawText(stream, regularFont, 7.5f, "MÃ BĂM BẢO MẬT (SEC-HASH)", 64, 112, COLOR_MUTED);
                drawText(stream, boldFont, 8.5f, securityHash, 64, 98, COLOR_HEADING);
                drawText(stream, regularFont, 7.0f, "Bảo lưu & đối soát trực tuyến bởi EduAlto", 64, 82, COLOR_MUTED);

                // 13. Bottom Center: TEM BẢO MẬT CHỐNG LÀM GIẢ (Official Security Seal Stamp)
                float sealCenterX = pageWidth / 2f;
                float sealCenterY = 154f;
                drawSecuritySeal(stream, boldFont, regularFont, sealCenterX, sealCenterY);

                // 14. Bottom Right: QR Code Online Verification Container
                drawQrVerificationCard(stream, document, regularFont, boldFont, verificationUrl, pageWidth);
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Không thể tạo file PDF chứng chỉ", exception);
        }
    }

    /**
     * Renders the Official Anti-Counterfeit Security Stamp (Tem bảo mật chống làm giả).
     */
    private void drawSecuritySeal(PDPageContentStream stream, PDFont boldFont, PDFont regularFont, float cx, float cy) throws IOException {
        // Decorative ribbon tails extending below the seal
        drawRibbonTail(stream, cx - 18f, cy - 36f, cx - 30f, cy - 62f, cx - 16f, cy - 54f, cx - 6f, cy - 36f, COLOR_GOLD, COLOR_GOLD_DARK);
        drawRibbonTail(stream, cx + 6f, cy - 36f, cx + 16f, cy - 54f, cx + 30f, cy - 62f, cx + 18f, cy - 36f, COLOR_GOLD, COLOR_GOLD_DARK);

        // Outer Scalloped Rosette (36-point security wheel)
        drawRosette(stream, cx, cy, 47f, 43f, 36, COLOR_GOLD, COLOR_GOLD_DARK, 0.75f);

        // Outer white border ring
        drawCircle(stream, cx, cy, 41.5f, Color.WHITE, 1.5f);

        // Middle emerald ring band
        fillCircle(stream, cx, cy, 40f, COLOR_SEAL_BG);
        drawCircle(stream, cx, cy, 40f, COLOR_PRIMARY, 1.2f);

        // Inner gold circle
        drawCircle(stream, cx, cy, 32f, COLOR_GOLD, 0.9f);

        // Text inside seal
        drawCenteredTextAt(stream, boldFont, 7.0f, "TEM BẢO MẬT", cx, cy + 20f, COLOR_HEADING);
        drawCenteredTextAt(stream, boldFont, 6.2f, "CHỐNG LÀM GIẢ", cx, cy + 11f, COLOR_GOLD_DARK);

        // 5 Center Security Stars (pure vector math)
        float starY = cy + 1f;
        float[] starXOffsets = {-16f, -8f, 0f, 8f, 16f};
        for (int i = 0; i < 5; i++) {
            float size = (i == 2) ? 3.4f : 2.7f;
            drawStar(stream, cx + starXOffsets[i], starY, size, size * 0.4f, COLOR_GOLD);
        }

        drawCenteredTextAt(stream, boldFont, 6.2f, "EDUALTO VERIFIED", cx, cy - 10f, COLOR_PRIMARY_DARK);
        drawCenteredTextAt(stream, regularFont, 5.2f, "CHỨNG THỰC SỐ GỐC", cx, cy - 19f, COLOR_MUTED);

        // Official platform label below seal
        drawCenteredTextAt(stream, boldFont, 8.5f, "HỆ THỐNG CHỨNG THỰC ĐIỆN TỬ EDUALTO", cx, cy - 74f, COLOR_HEADING);
        drawCenteredTextAt(stream, regularFont, 7.5f, "Tem bảo mật số đối soát trực tuyến • Chống giả mạo", cx, cy - 86f, COLOR_MUTED);
    }

    /**
     * Renders the dynamic QR Code online verification box on the right.
     */
    private void drawQrVerificationCard(PDPageContentStream stream, PDDocument document, PDFont regularFont, PDFont boldFont, String verificationUrl, float pageWidth) throws IOException {
        float cardWidth = 120f;
        float cardHeight = 158f;
        float cardX = pageWidth - 64f - cardWidth;
        float cardY = 74f;
        float cardCenterX = cardX + (cardWidth / 2f);

        // Card container
        stream.setNonStrokingColor(Color.WHITE);
        stream.setStrokingColor(COLOR_BORDER_LIGHT);
        stream.setLineWidth(0.75f);
        stream.addRect(cardX, cardY, cardWidth, cardHeight);
        stream.fillAndStroke();

        // Card title
        drawCenteredTextAt(stream, boldFont, 8.0f, "MÃ QR XÁC THỰC", cardCenterX, cardY + cardHeight - 16f, COLOR_HEADING);
        drawCenteredTextAt(stream, regularFont, 6.8f, "KIỂM TRA TRỰC TUYẾN", cardCenterX, cardY + cardHeight - 26f, COLOR_MUTED);

        // QR Image
        byte[] qrBytes = qrCodeGenerator.generatePng(verificationUrl, 200, 200);
        PDImageXObject qrImage = PDImageXObject.createFromByteArray(document, qrBytes, "certificate-qr");
        float qrSize = 78f;
        float qrX = cardCenterX - (qrSize / 2f);
        float qrY = cardY + 42f;
        stream.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        // Card subtext
        drawCenteredTextAt(stream, boldFont, 7.2f, "Quét để xem bản gốc", cardCenterX, cardY + 28f, COLOR_PRIMARY_DARK);
        drawCenteredTextAt(stream, regularFont, 6.2f, "Xác thực tức thì 24/7", cardCenterX, cardY + 16f, COLOR_MUTED);
    }

    /**
     * Renders the official EduAlto logo image at the top of the certificate.
     */
    private void drawHeaderLogo(PDPageContentStream stream, PDDocument document, PDFont boldFont, PDFont regularFont, float pageWidth) {
        try (InputStream logoStream = getClass().getResourceAsStream("/images/logo-with-text.png")) {
            if (logoStream != null) {
                byte[] logoBytes = logoStream.readAllBytes();
                PDImageXObject logoImage = PDImageXObject.createFromByteArray(document, logoBytes, "edualto-logo");
                float targetHeight = 44f;
                float targetWidth = targetHeight * (logoImage.getWidth() / (float) logoImage.getHeight());
                float logoX = (pageWidth - targetWidth) / 2f;
                float logoY = 496f;
                stream.drawImage(logoImage, logoX, logoY, targetWidth, targetHeight);
                drawCenteredText(stream, regularFont, 8.5f, "NỀN TẢNG HỌC TẬP TRỰC TUYẾN", 482f, pageWidth, COLOR_MUTED);
                return;
            }
        } catch (Exception ignored) {
            // fallback
        }
        try {
            drawCenteredText(stream, boldFont, 16, "E D U A L T O", 522, pageWidth, COLOR_PRIMARY);
            drawCenteredText(stream, regularFont, 9, "NỀN TẢNG HỌC TẬP TRỰC TUYẾN", 506, pageWidth, COLOR_MUTED);
        } catch (IOException ignored) {
        }
    }

    /**
     * Draws decorative multi-layer borders and anti-counterfeiting microtext.
     */
    private void drawDecorativeBorders(PDPageContentStream stream, PDFont font, float pageWidth, float pageHeight) throws IOException {
        // Outer primary frame
        stream.setStrokingColor(COLOR_PRIMARY);
        stream.setLineWidth(3.0f);
        stream.addRect(22, 22, pageWidth - 44, pageHeight - 44);
        stream.stroke();

        // Middle gold frame
        stream.setStrokingColor(COLOR_GOLD);
        stream.setLineWidth(1.0f);
        stream.addRect(28, 28, pageWidth - 56, pageHeight - 56);
        stream.stroke();

        // Microtext security line along inner perimeter
        String microtext = " • EDUALTO SECURE CERTIFICATE • TEM BẢO MẬT CHỐNG LÀM GIẢ • XÁC THỰC TRỰC TUYẾN • ANTI-COUNTERFEIT PROTECTION";
        stream.setNonStrokingColor(new Color(160, 195, 185));
        float textWidth = font.getStringWidth(sanitizeText(microtext, font)) / 1000f * 4.2f;
        int repetitions = (int) Math.ceil((pageWidth - 70) / textWidth);
        StringBuilder lineBuilder = new StringBuilder();
        for (int i = 0; i < repetitions; i++) {
            lineBuilder.append(microtext);
        }
        String fullMicrotext = sanitizeText(lineBuilder.toString(), font);

        drawText(stream, font, 4.2f, fullMicrotext, 34, pageHeight - 34, new Color(170, 200, 190));
        drawText(stream, font, 4.2f, fullMicrotext, 34, 32, new Color(170, 200, 190));

        // Inner fine border
        stream.setStrokingColor(COLOR_BORDER_LIGHT);
        stream.setLineWidth(0.5f);
        stream.addRect(38, 38, pageWidth - 76, pageHeight - 76);
        stream.stroke();

        // Corner corner brackets
        drawCornerBrackets(stream, 38, 38, pageWidth - 76, pageHeight - 76, 14f, COLOR_GOLD);
    }

    /**
     * Draws guilloche security wave lines across the certificate.
     */
    private void drawGuillochePattern(PDPageContentStream stream, float pageWidth, float pageHeight) throws IOException {
        stream.setStrokingColor(new Color(236, 248, 243));
        stream.setLineWidth(0.5f);

        // Subtle waves along top header area
        for (int w = 0; w < 3; w++) {
            float baseY = 544f - (w * 5f);
            stream.moveTo(42, baseY);
            for (float x = 42; x <= pageWidth - 42; x += 12) {
                float yOffset = (float) Math.sin((x + w * 25) * 0.04) * 2.8f;
                stream.lineTo(x, baseY + yOffset);
            }
            stream.stroke();
        }

        // Subtle waves above footer divider
        for (int w = 0; w < 3; w++) {
            float baseY = 256f + (w * 5f);
            stream.moveTo(42, baseY);
            for (float x = 42; x <= pageWidth - 42; x += 12) {
                float yOffset = (float) Math.sin((x + w * 30) * 0.04) * 2.8f;
                stream.lineTo(x, baseY + yOffset);
            }
            stream.stroke();
        }
    }

    /**
     * Draws a subtle background watermark in the center.
     */
    private void drawWatermark(PDPageContentStream stream, PDFont font, float pageWidth, float pageHeight) throws IOException {
        float centerX = pageWidth / 2f;
        float centerY = 370f;

        // Faint watermark outer circle
        drawCircle(stream, centerX, centerY, 110f, COLOR_WATERMARK, 1.5f);
        drawCircle(stream, centerX, centerY, 95f, COLOR_WATERMARK, 0.75f);

        drawCenteredTextAt(stream, font, 24f, "EDUALTO", centerX, centerY + 10f, new Color(242, 249, 246));
        drawCenteredTextAt(stream, font, 9f, "SECURED & VERIFIED", centerX, centerY - 14f, new Color(240, 248, 245));
    }

    /**
     * Computes a SHA-256 integrity hash for anti-tampering verification.
     */
    private String computeSecurityHash(String certNumber, String studentName, String courseTitle, String date) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = certNumber + "|" + studentName + "|" + courseTitle + "|" + date;
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 8; i++) {
                hex.append(String.format("%02X", hash[i]));
            }
            return "SEC-" + hex.substring(0, 4) + "-" + hex.substring(4, 8) + "-" + hex.substring(8, 12) + "-" + hex.substring(12, 16);
        } catch (NoSuchAlgorithmException e) {
            return "SEC-AUTHENTIC-VALID";
        }
    }

    private void drawRosette(PDPageContentStream stream, float cx, float cy, float outerRadius, float innerRadius, int points, Color fillColor, Color strokeColor, float lineWidth) throws IOException {
        stream.setNonStrokingColor(fillColor);
        stream.setStrokingColor(strokeColor);
        stream.setLineWidth(lineWidth);
        for (int i = 0; i <= points * 2; i++) {
            double angle = i * Math.PI / points;
            float radius = (i % 2 == 0) ? outerRadius : innerRadius;
            float x = cx + (float) (radius * Math.cos(angle));
            float y = cy + (float) (radius * Math.sin(angle));
            if (i == 0) {
                stream.moveTo(x, y);
            } else {
                stream.lineTo(x, y);
            }
        }
        stream.closePath();
        stream.fillAndStroke();
    }

    private void drawCircle(PDPageContentStream stream, float cx, float cy, float r, Color strokeColor, float lineWidth) throws IOException {
        stream.setStrokingColor(strokeColor);
        stream.setLineWidth(lineWidth);
        float k = 0.55228475f * r;
        stream.moveTo(cx - r, cy);
        stream.curveTo(cx - r, cy + k, cx - k, cy + r, cx, cy + r);
        stream.curveTo(cx + k, cy + r, cx + r, cy + k, cx + r, cy);
        stream.curveTo(cx + r, cy - k, cx + k, cy - r, cx, cy - r);
        stream.curveTo(cx - k, cy - r, cx - r, cy - k, cx - r, cy);
        stream.stroke();
    }

    private void fillCircle(PDPageContentStream stream, float cx, float cy, float r, Color fillColor) throws IOException {
        stream.setNonStrokingColor(fillColor);
        float k = 0.55228475f * r;
        stream.moveTo(cx - r, cy);
        stream.curveTo(cx - r, cy + k, cx - k, cy + r, cx, cy + r);
        stream.curveTo(cx + k, cy + r, cx + r, cy + k, cx + r, cy);
        stream.curveTo(cx + r, cy - k, cx + k, cy - r, cx, cy - r);
        stream.curveTo(cx - k, cy - r, cx - r, cy - k, cx - r, cy);
        stream.fill();
    }

    private void drawStar(PDPageContentStream stream, float cx, float cy, float outerRadius, float innerRadius, Color color) throws IOException {
        stream.setNonStrokingColor(color);
        int points = 5;
        for (int i = 0; i < points * 2; i++) {
            double angle = i * Math.PI / points - Math.PI / 2.0;
            float radius = (i % 2 == 0) ? outerRadius : innerRadius;
            float x = cx + (float) (radius * Math.cos(angle));
            float y = cy + (float) (radius * Math.sin(angle));
            if (i == 0) {
                stream.moveTo(x, y);
            } else {
                stream.lineTo(x, y);
            }
        }
        stream.closePath();
        stream.fill();
    }

    private void drawDiamond(PDPageContentStream stream, float cx, float cy, float size, Color color) throws IOException {
        stream.setNonStrokingColor(color);
        stream.moveTo(cx, cy + size);
        stream.lineTo(cx + size, cy);
        stream.lineTo(cx, cy - size);
        stream.lineTo(cx - size, cy);
        stream.closePath();
        stream.fill();
    }

    private void drawRibbonTail(PDPageContentStream stream, float x1, float y1, float x2, float y2, float x3, float y3, float x4, float y4, Color fillColor, Color strokeColor) throws IOException {
        stream.setNonStrokingColor(fillColor);
        stream.setStrokingColor(strokeColor);
        stream.setLineWidth(0.75f);
        stream.moveTo(x1, y1);
        stream.lineTo(x2, y2);
        stream.lineTo(x3, y3);
        stream.lineTo(x4, y4);
        stream.closePath();
        stream.fillAndStroke();
    }

    private void drawCornerBrackets(PDPageContentStream stream, float x, float y, float width, float height, float bracketSize, Color color) throws IOException {
        stream.setStrokingColor(color);
        stream.setLineWidth(1.2f);

        // Bottom-left
        stream.moveTo(x + bracketSize, y);
        stream.lineTo(x, y);
        stream.lineTo(x, y + bracketSize);

        // Top-left
        stream.moveTo(x, y + height - bracketSize);
        stream.lineTo(x, y + height);
        stream.lineTo(x + bracketSize, y + height);

        // Top-right
        stream.moveTo(x + width - bracketSize, y + height);
        stream.lineTo(x + width, y + height);
        stream.lineTo(x + width, y + height - bracketSize);

        // Bottom-right
        stream.moveTo(x + width, y + bracketSize);
        stream.lineTo(x + width, y);
        stream.lineTo(x + width - bracketSize, y);

        stream.stroke();
    }

    private PDFont loadFont(PDDocument document, String resourcePath, Standard14Fonts.FontName fallbackFontName) {
        try (InputStream stream = getClass().getResourceAsStream(resourcePath)) {
            if (stream != null) {
                return PDType0Font.load(document, stream, true);
            }
        } catch (Exception ignored) {
            // fallback to standard PDF font if custom TTF is unavailable
        }
        return new PDType1Font(fallbackFontName);
    }

    private void drawText(PDPageContentStream stream, PDFont font, float fontSize, String text, float x, float y, Color color) throws IOException {
        stream.setNonStrokingColor(color);
        stream.beginText();
        stream.setFont(font, fontSize);
        stream.newLineAtOffset(x, y);
        stream.showText(sanitizeText(text, font));
        stream.endText();
    }

    private void drawCenteredText(PDPageContentStream stream, PDFont font, float fontSize, String text, float y, float pageWidth, Color color) throws IOException {
        String sanitized = sanitizeText(text, font);
        float textWidth = font.getStringWidth(sanitized) / 1000f * fontSize;
        float startX = (pageWidth - textWidth) / 2f;
        stream.setNonStrokingColor(color);
        stream.beginText();
        stream.setFont(font, fontSize);
        stream.newLineAtOffset(startX, y);
        stream.showText(sanitized);
        stream.endText();
    }

    private void drawCenteredTextAt(PDPageContentStream stream, PDFont font, float fontSize, String text, float centerX, float y, Color color) throws IOException {
        String sanitized = sanitizeText(text, font);
        float textWidth = font.getStringWidth(sanitized) / 1000f * fontSize;
        float startX = centerX - (textWidth / 2f);
        stream.setNonStrokingColor(color);
        stream.beginText();
        stream.setFont(font, fontSize);
        stream.newLineAtOffset(startX, y);
        stream.showText(sanitized);
        stream.endText();
    }

    private String fitText(String text, PDFont font, float fontSize, float maxWidth) throws IOException {
        String sanitized = sanitizeText(text, font);
        float textWidth = font.getStringWidth(sanitized) / 1000f * fontSize;
        if (textWidth <= maxWidth) {
            return sanitized;
        }
        while (textWidth > maxWidth && sanitized.length() > 4) {
            sanitized = sanitized.substring(0, sanitized.length() - 2).trim();
            textWidth = font.getStringWidth(sanitized + "...") / 1000f * fontSize;
        }
        return sanitized + "...";
    }

    private String sanitizeText(String text, PDFont font) {
        if (text == null) {
            return "";
        }
        if (font instanceof PDType0Font type0Font) {
            try {
                type0Font.encode(text);
                return text;
            } catch (Exception ignored) {
                String unaccented = removeAccents(text);
                try {
                    type0Font.encode(unaccented);
                    return unaccented;
                } catch (Exception ignored2) {
                    return text.replaceAll("[^\\x20-\\x7E]", "");
                }
            }
        }
        return removeAccents(text);
    }

    private String removeAccents(String text) {
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").replace("Đ", "D").replace("đ", "d");
    }
}
