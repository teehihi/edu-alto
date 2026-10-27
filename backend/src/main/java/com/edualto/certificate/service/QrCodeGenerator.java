package com.edualto.certificate.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class QrCodeGenerator {
    private final QRCodeWriter qrCodeWriter = new QRCodeWriter();

    public byte[] generatePng(String text, int width, int height) {
        try {
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 1);

            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height, hints);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể tạo mã QR cho chứng chỉ", exception);
        }
    }

    public String generateDataUrl(String text, int width, int height) {
        byte[] pngBytes = generatePng(text, width, height);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(pngBytes);
    }
}
