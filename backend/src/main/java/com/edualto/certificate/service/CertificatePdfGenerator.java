package com.edualto.certificate.service;

import com.edualto.certificate.domain.Certificate;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
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

    private static final Color COLOR_PRIMARY = new Color(32, 180, 134);       // #20B486
    private static final Color COLOR_PRIMARY_DARK = new Color(21, 158, 117);  // #159E75
    private static final Color COLOR_HEADING = new Color(16, 26, 44);         // #101A2C
    private static final Color COLOR_MUTED = new Color(102, 112, 133);        // #667085
    private static final Color COLOR_BORDER_LIGHT = new Color(221, 239, 233);  // #DDEFE9
    private static final Color COLOR_DIVIDER = new Color(226, 232, 240);       // #E2E8F0

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
                // Background
                stream.setNonStrokingColor(254, 255, 254);
                stream.addRect(0, 0, pageWidth, pageHeight);
                stream.fill();

                // Decorative Outer Borders
                stream.setStrokingColor(COLOR_PRIMARY);
                stream.setLineWidth(3.0f);
                stream.addRect(24, 24, pageWidth - 48, pageHeight - 48);
                stream.stroke();

                stream.setLineWidth(1.0f);
                stream.addRect(30, 30, pageWidth - 60, pageHeight - 60);
                stream.stroke();

                stream.setStrokingColor(COLOR_BORDER_LIGHT);
                stream.setLineWidth(0.5f);
                stream.addRect(34, 34, pageWidth - 68, pageHeight - 68);
                stream.stroke();

                // Platform Brand Header
                drawCenteredText(stream, boldFont, 16, "E D U A L T O", 516, pageWidth, COLOR_PRIMARY);
                drawCenteredText(stream, regularFont, 9, "NEN TANG HOC TAP TRUC TUYEN", 500, pageWidth, COLOR_MUTED);

                // Certificate Title
                drawCenteredText(stream, boldFont, 28, "CHUNG NHAN HOAN THANH", 440, pageWidth, COLOR_HEADING);
                drawCenteredText(stream, regularFont, 12, "Chung nhan rang", 412, pageWidth, COLOR_MUTED);

                // Student Name
                String studentName = certificate.studentName();
                drawCenteredText(stream, boldFont, 26, studentName, 368, pageWidth, COLOR_PRIMARY_DARK);

                // Accent Underline
                float studentWidth = Math.min(boldFont.getStringWidth(studentName) / 1000f * 26 + 40, pageWidth - 200);
                float lineStartX = (pageWidth - studentWidth) / 2f;
                stream.setStrokingColor(COLOR_PRIMARY);
                stream.setLineWidth(1.5f);
                stream.moveTo(lineStartX, 355);
                stream.lineTo(lineStartX + studentWidth, 355);
                stream.stroke();

                // Completion Text
                drawCenteredText(stream, regularFont, 12, "da hoan thanh xuat sac toan bo noi dung xuat ban cua khoa hoc", 328, pageWidth, COLOR_MUTED);

                // Course Title (fit and wrap or truncate if needed)
                String courseTitle = fitText(certificate.courseTitle(), boldFont, 20, pageWidth - 160);
                drawCenteredText(stream, boldFont, 20, courseTitle, 290, pageWidth, COLOR_HEADING);

                // Instructor
                String instructorText = "Giang vien huong dan: " + certificate.instructorName();
                drawCenteredText(stream, regularFont, 12, instructorText, 258, pageWidth, COLOR_MUTED);

                // Divider Line
                stream.setStrokingColor(COLOR_DIVIDER);
                stream.setLineWidth(0.75f);
                stream.moveTo(56, 200);
                stream.lineTo(pageWidth - 56, 200);
                stream.stroke();

                // Footer - Left: Date & Certificate ID
                String issueDate = DATE_FORMATTER.format(certificate.issuedAt());
                drawText(stream, regularFont, 9, "NGAY CAP CHUNG NHAN", 64, 164, COLOR_MUTED);
                drawText(stream, boldFont, 12, issueDate, 64, 146, COLOR_HEADING);

                drawText(stream, regularFont, 9, "MA XAC THUC DIEN TU", 64, 116, COLOR_MUTED);
                drawText(stream, boldFont, 11, certificate.certificateNumber(), 64, 100, COLOR_PRIMARY_DARK);

                // Footer - Center: Seal / Official Platform Note
                drawCenteredText(stream, boldFont, 10, "HE THONG CHUNG CHI DIEN TU EDUALTO", 150, pageWidth, COLOR_HEADING);
                drawCenteredText(stream, regularFont, 9, "Chung chi hop le va duoc luu tru tren he thong", 134, pageWidth, COLOR_MUTED);
                drawCenteredText(stream, regularFont, 8, "Kiem tra tinh xac thuc bang ma QR hoac ma chung chi", 120, pageWidth, COLOR_MUTED);

                // Footer - Right: QR Code for Verification
                byte[] qrBytes = qrCodeGenerator.generatePng(verificationUrl, 200, 200);
                PDImageXObject qrImage = PDImageXObject.createFromByteArray(document, qrBytes, "certificate-qr");
                float qrSize = 82f;
                float qrX = pageWidth - 64 - qrSize;
                float qrY = 92f;
                stream.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

                float qrCenterX = qrX + (qrSize / 2f);
                drawCenteredTextAt(stream, regularFont, 7.5f, "Quet de xac thuc", qrCenterX, 80f, COLOR_MUTED);
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Không thể tạo file PDF chứng chỉ", exception);
        }
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
        if (font instanceof PDType0Font) {
            return text;
        }
        // If fallback standard Type1 font (which only supports WinAnsi / ASCII), strip accents cleanly
        return removeAccents(text);
    }

    private String removeAccents(String text) {
        String normalized = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").replace("Đ", "D").replace("đ", "d");
    }
}
