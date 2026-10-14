package com.edualto.storage.infrastructure;

import com.edualto.common.exception.BusinessException;
import java.awt.AlphaComposite;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Iterator;
import java.util.Locale;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Validates and normalizes uploaded raster images before they are stored.
 * WebP encoding/decoding is delegated to Alpine's patched libwebp command-line tools.
 */
@Component
public class ImageWebpProcessor {

    private static final Logger log = LoggerFactory.getLogger(ImageWebpProcessor.class);
    private static final long MAX_INPUT_PIXELS = 12_000_000L;
    private static final int MAX_SOURCE_DIMENSION = 20_000;
    private static final long MAX_OUTPUT_BYTES = 15L * 1024 * 1024;
    private static final Duration PROCESS_TIMEOUT = Duration.ofSeconds(30);
    private static final byte[] PNG_SIGNATURE = {
            (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    };
    private static final byte[] JPEG_SIGNATURE = {
            (byte) 0xff, (byte) 0xd8, (byte) 0xff
    };

    private final String encoderCommand;
    private final String decoderCommand;
    private final Semaphore conversionSlots = new Semaphore(2);

    public ImageWebpProcessor(
            @Value("${edualto.media.webp.encoder:cwebp}") String encoderCommand,
            @Value("${edualto.media.webp.decoder:dwebp}") String decoderCommand
    ) {
        this.encoderCommand = encoderCommand;
        this.decoderCommand = decoderCommand;
    }

    public byte[] normalize(byte[] source, String contentType, int maxDimension) {
        String normalizedContentType = contentType == null ? "" : contentType.trim().toLowerCase(Locale.ROOT);
        if (source == null || source.length == 0 || maxDimension < 1) {
            throw invalidImage();
        }

        if (!conversionSlots.tryAcquire()) {
            throw new BusinessException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "IMAGE_PROCESSING_BUSY",
                    "Hệ thống đang xử lý nhiều ảnh. Vui lòng thử lại sau ít giây."
            );
        }

        Path tempDirectory = null;
        try {
            ImageHeader header = inspectHeader(source, normalizedContentType);
            validateDimensions(header.width(), header.height());
            tempDirectory = Files.createTempDirectory("edualto-image-");
            Path sourceFile = tempDirectory.resolve("source" + extensionFor(normalizedContentType));
            Path decodedPng = tempDirectory.resolve("decoded.png");
            Path normalizedPng = tempDirectory.resolve("normalized.png");
            Path outputWebp = tempDirectory.resolve("output.webp");
            Files.write(sourceFile, source);

            BufferedImage decoded;
            if ("image/webp".equals(normalizedContentType)) {
                runTool(true, decoderCommand, sourceFile.toString(), "-o", decodedPng.toString());
                decoded = readStandardImage(decodedPng, "png");
            } else {
                decoded = readStandardImage(sourceFile, "image/png".equals(normalizedContentType) ? "png" : "jpeg");
            }

            BufferedImage oriented = applyOrientation(decoded, header.orientation());
            BufferedImage resized = resizeDown(oriented, maxDimension);
            if (!ImageIO.write(resized, "png", normalizedPng.toFile())) {
                throw invalidImage();
            }

            if ("image/jpeg".equals(normalizedContentType)) {
                runTool(false, encoderCommand, "-quiet", "-mt", "-q", "90", "-m", "4",
                        normalizedPng.toString(), "-o", outputWebp.toString());
            } else {
                // Lossless mode preserves fine text, line art, and alpha; -exact also keeps hidden RGB values.
                runTool(false, encoderCommand, "-quiet", "-mt", "-lossless", "-exact", "-z", "6",
                        normalizedPng.toString(), "-o", outputWebp.toString());
            }

            long outputSize = Files.size(outputWebp);
            if (outputSize <= 0 || outputSize > MAX_OUTPUT_BYTES) {
                throw new BusinessException(
                        HttpStatus.BAD_REQUEST,
                        "IMAGE_OUTPUT_TOO_LARGE",
                        "Ảnh sau khi xử lý vượt quá dung lượng cho phép. Vui lòng chọn ảnh nhỏ hơn."
                );
            }
            return Files.readAllBytes(outputWebp);
        } catch (BusinessException exception) {
            throw exception;
        } catch (IOException exception) {
            log.warn("Không thể xử lý ảnh tải lên thành WebP", exception);
            throw new BusinessException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "IMAGE_PROCESSING_UNAVAILABLE",
                    "Dịch vụ xử lý ảnh hiện chưa khả dụng. Vui lòng thử lại sau."
            );
        } finally {
            try {
                deleteTemporaryFiles(tempDirectory);
            } finally {
                conversionSlots.release();
            }
        }
    }

    private ImageHeader inspectHeader(byte[] source, String contentType) {
        if ("image/webp".equals(contentType)) {
            return inspectWebpHeader(source);
        }
        if ("image/png".equals(contentType) && startsWith(source, PNG_SIGNATURE)) {
            return inspectImageIoHeader(source, "png", readPngOrientation(source));
        }
        if ("image/jpeg".equals(contentType) && startsWith(source, JPEG_SIGNATURE)) {
            return inspectImageIoHeader(source, "jpeg", readJpegOrientation(source));
        }
        throw invalidImage();
    }

    private ImageHeader inspectImageIoHeader(byte[] source, String expectedFormat, int orientation) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(source))) {
            if (input == null) {
                throw invalidImage();
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalidImage();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, false);
                String actualFormat = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!expectedFormat.equals(actualFormat)
                        && !("jpeg".equals(expectedFormat) && "jpg".equals(actualFormat))) {
                    throw invalidImage();
                }
                return new ImageHeader(reader.getWidth(0), reader.getHeight(0), orientation);
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw invalidImage();
        }
    }

    private ImageHeader inspectWebpHeader(byte[] source) {
        if (source.length < 30 || !asciiEquals(source, 0, "RIFF") || !asciiEquals(source, 8, "WEBP")) {
            throw invalidImage();
        }
        long riffEnd = 8L + readUnsignedIntLittleEndian(source, 4);
        if (riffEnd < 12 || riffEnd > source.length) {
            throw invalidImage();
        }

        int width = -1;
        int height = -1;
        int orientation = 1;
        boolean animated = false;
        int position = 12;
        while (position + 8L <= riffEnd) {
            String chunkType = ascii(source, position, 4);
            long chunkLength = readUnsignedIntLittleEndian(source, position + 4);
            long payloadEnd = position + 8L + chunkLength;
            if (payloadEnd > riffEnd || payloadEnd > source.length) {
                throw invalidImage();
            }
            int payload = position + 8;
            if ("VP8X".equals(chunkType)) {
                if (chunkLength < 10) {
                    throw invalidImage();
                }
                animated = (source[payload] & 0x02) != 0;
                width = readUnsignedInt24LittleEndian(source, payload + 4) + 1;
                height = readUnsignedInt24LittleEndian(source, payload + 7) + 1;
            } else if ("VP8 ".equals(chunkType) && width < 0) {
                if (chunkLength < 10 || source[payload + 3] != (byte) 0x9d
                        || source[payload + 4] != 0x01 || source[payload + 5] != 0x2a) {
                    throw invalidImage();
                }
                width = readUnsignedShortLittleEndian(source, payload + 6) & 0x3fff;
                height = readUnsignedShortLittleEndian(source, payload + 8) & 0x3fff;
            } else if ("VP8L".equals(chunkType) && width < 0) {
                if (chunkLength < 5 || source[payload] != 0x2f) {
                    throw invalidImage();
                }
                long dimensions = (source[payload + 1] & 0xffL)
                        | ((source[payload + 2] & 0xffL) << 8)
                        | ((source[payload + 3] & 0xffL) << 16)
                        | ((source[payload + 4] & 0xffL) << 24);
                width = (int) (dimensions & 0x3fff) + 1;
                height = (int) ((dimensions >>> 14) & 0x3fff) + 1;
            } else if ("ANIM".equals(chunkType) || "ANMF".equals(chunkType)) {
                animated = true;
            } else if ("EXIF".equals(chunkType)) {
                int exifOffset = payload;
                int exifLength = (int) chunkLength;
                if (startsWith(source, exifOffset, new byte[]{'E', 'x', 'i', 'f', 0, 0})) {
                    exifOffset += 6;
                    exifLength -= 6;
                }
                orientation = readTiffOrientation(source, exifOffset, exifLength);
            }
            position = (int) (payloadEnd + (chunkLength & 1));
        }
        if (animated || width <= 0 || height <= 0) {
            throw invalidImage();
        }
        return new ImageHeader(width, height, orientation);
    }

    private BufferedImage readStandardImage(Path path, String expectedFormat) {
        try (ImageInputStream input = ImageIO.createImageInputStream(path.toFile())) {
            if (input == null) {
                throw invalidImage();
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalidImage();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                String actualFormat = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!expectedFormat.equals(actualFormat)
                        && !("jpeg".equals(expectedFormat) && "jpg".equals(actualFormat))) {
                    throw invalidImage();
                }
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                validateDimensions(width, height);
                BufferedImage image = reader.read(0);
                if (image == null || image.getWidth() != width || image.getHeight() != height) {
                    throw invalidImage();
                }
                return image;
            } finally {
                reader.dispose();
            }
        } catch (IOException exception) {
            throw invalidImage();
        }
    }

    private BufferedImage applyOrientation(BufferedImage source, int orientation) {
        int width = source.getWidth();
        int height = source.getHeight();
        boolean swapDimensions = orientation >= 5 && orientation <= 8;
        int targetWidth = swapDimensions ? height : width;
        int targetHeight = swapDimensions ? width : height;
        AffineTransform transform = new AffineTransform();
        switch (orientation) {
            case 2 -> {
                transform.translate(width, 0);
                transform.scale(-1, 1);
            }
            case 3 -> {
                transform.translate(width, height);
                transform.rotate(Math.PI);
            }
            case 4 -> {
                transform.translate(0, height);
                transform.scale(1, -1);
            }
            case 5 -> {
                transform = new AffineTransform(0, 1, 1, 0, 0, 0);
            }
            case 6 -> {
                transform.translate(height, 0);
                transform.rotate(Math.PI / 2);
            }
            case 7 -> {
                transform = new AffineTransform(0, -1, -1, 0, height, width);
            }
            case 8 -> {
                transform.translate(0, width);
                transform.rotate(-Math.PI / 2);
            }
            default -> {
                return source;
            }
        }
        BufferedImage oriented = new BufferedImage(
                targetWidth,
                targetHeight,
                source.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB
        );
        Graphics2D graphics = oriented.createGraphics();
        try {
            graphics.setComposite(AlphaComposite.Src);
            graphics.drawImage(source, transform, null);
        } finally {
            graphics.dispose();
        }
        return oriented;
    }

    private BufferedImage resizeDown(BufferedImage source, int maxDimension) {
        int width = source.getWidth();
        int height = source.getHeight();
        int longestSide = Math.max(width, height);
        if (longestSide <= maxDimension) {
            return source;
        }
        double scale = (double) maxDimension / longestSide;
        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));
        BufferedImage resized = new BufferedImage(
                targetWidth,
                targetHeight,
                source.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB
        );
        Graphics2D graphics = resized.createGraphics();
        try {
            graphics.setComposite(AlphaComposite.Src);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }
        return resized;
    }

    private void runTool(boolean invalidSourceOnFailure, String executable, String... arguments) throws IOException {
        String[] command = new String[arguments.length + 1];
        command[0] = executable;
        System.arraycopy(arguments, 0, command, 1, arguments.length);
        Process process = new ProcessBuilder(command)
                .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                .redirectError(ProcessBuilder.Redirect.DISCARD)
                .start();
        try {
            if (!process.waitFor(PROCESS_TIMEOUT.toSeconds(), TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IOException("Image processor timed out");
            }
            if (process.exitValue() != 0) {
                if (invalidSourceOnFailure) {
                    throw invalidImage();
                }
                throw new IOException("Image processor rejected the input");
            }
        } catch (InterruptedException exception) {
            process.destroyForcibly();
            Thread.currentThread().interrupt();
            throw new IOException("Image processor was interrupted", exception);
        }
    }

    private void validateDimensions(int width, int height) {
        if (width <= 0 || height <= 0 || width > MAX_SOURCE_DIMENSION || height > MAX_SOURCE_DIMENSION
                || (long) width * height > MAX_INPUT_PIXELS) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "IMAGE_DIMENSIONS_TOO_LARGE",
                    "Kích thước ảnh vượt quá giới hạn xử lý. Vui lòng giảm độ phân giải trước khi tải lên."
            );
        }
    }

    private int readJpegOrientation(byte[] source) {
        int position = 2;
        while (position + 4 <= source.length && (source[position] & 0xff) == 0xff) {
            int marker = source[position + 1] & 0xff;
            position += 2;
            if (marker == 0xd8 || marker == 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
                continue;
            }
            if (marker == 0xd9 || marker == 0xda) {
                break;
            }
            int segmentLength = readUnsignedShortBigEndian(source, position);
            if (segmentLength < 2 || position + segmentLength > source.length) {
                return 1;
            }
            int payload = position + 2;
            int payloadLength = segmentLength - 2;
            if (marker == 0xe1 && payloadLength >= 14 && startsWith(source, payload,
                    new byte[]{'E', 'x', 'i', 'f', 0, 0})) {
                return readTiffOrientation(source, payload + 6, payloadLength - 6);
            }
            position += segmentLength;
        }
        return 1;
    }

    private int readPngOrientation(byte[] source) {
        int position = PNG_SIGNATURE.length;
        while (position + 12 <= source.length) {
            long chunkLength = readUnsignedIntBigEndian(source, position);
            long payload = position + 8L;
            long chunkEnd = payload + chunkLength;
            if (chunkEnd + 4 > source.length || chunkLength > Integer.MAX_VALUE) {
                return 1;
            }
            if (asciiEquals(source, position + 4, "eXIf")) {
                return readTiffOrientation(source, (int) payload, (int) chunkLength);
            }
            if (asciiEquals(source, position + 4, "IEND")) {
                break;
            }
            position = (int) (chunkEnd + 4);
        }
        return 1;
    }

    private int readTiffOrientation(byte[] data, int offset, int length) {
        int end = offset + length;
        if (offset < 0 || length < 8 || end < offset || end > data.length) {
            return 1;
        }
        boolean littleEndian;
        if (data[offset] == 'I' && data[offset + 1] == 'I') {
            littleEndian = true;
        } else if (data[offset] == 'M' && data[offset + 1] == 'M') {
            littleEndian = false;
        } else {
            return 1;
        }
        if (readUnsignedShort(data, offset + 2, littleEndian) != 42) {
            return 1;
        }
        long ifdOffset = readUnsignedInt(data, offset + 4, littleEndian);
        long ifdPositionLong = offset + ifdOffset;
        if (ifdPositionLong + 2 > end || ifdPositionLong + 2 < ifdPositionLong) {
            return 1;
        }
        int ifdPosition = (int) ifdPositionLong;
        int entryCount = readUnsignedShort(data, ifdPosition, littleEndian);
        long entriesEnd = ifdPositionLong + 2L + (long) entryCount * 12;
        if (entriesEnd > end) {
            return 1;
        }
        for (int index = 0; index < entryCount; index++) {
            int entry = ifdPosition + 2 + index * 12;
            if (readUnsignedShort(data, entry, littleEndian) != 0x0112
                    || readUnsignedShort(data, entry + 2, littleEndian) != 3
                    || readUnsignedInt(data, entry + 4, littleEndian) < 1) {
                continue;
            }
            int orientation = readUnsignedShort(data, entry + 8, littleEndian);
            return orientation >= 1 && orientation <= 8 ? orientation : 1;
        }
        return 1;
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            default -> throw invalidImage();
        };
    }

    private boolean startsWith(byte[] source, byte[] signature) {
        return startsWith(source, 0, signature);
    }

    private boolean startsWith(byte[] source, int offset, byte[] signature) {
        if (offset < 0 || offset + signature.length > source.length) {
            return false;
        }
        for (int index = 0; index < signature.length; index++) {
            if (source[offset + index] != signature[index]) {
                return false;
            }
        }
        return true;
    }

    private boolean asciiEquals(byte[] data, int offset, String expected) {
        return offset >= 0 && offset + expected.length() <= data.length
                && expected.equals(ascii(data, offset, expected.length()));
    }

    private String ascii(byte[] data, int offset, int length) {
        return new String(data, offset, length, StandardCharsets.US_ASCII);
    }

    private int readUnsignedInt24LittleEndian(byte[] data, int offset) {
        return (data[offset] & 0xff) | ((data[offset + 1] & 0xff) << 8) | ((data[offset + 2] & 0xff) << 16);
    }

    private int readUnsignedShortLittleEndian(byte[] data, int offset) {
        return (data[offset] & 0xff) | ((data[offset + 1] & 0xff) << 8);
    }

    private long readUnsignedIntLittleEndian(byte[] data, int offset) {
        return (data[offset] & 0xffL)
                | ((data[offset + 1] & 0xffL) << 8)
                | ((data[offset + 2] & 0xffL) << 16)
                | ((data[offset + 3] & 0xffL) << 24);
    }

    private int readUnsignedShortBigEndian(byte[] data, int offset) {
        return ((data[offset] & 0xff) << 8) | (data[offset + 1] & 0xff);
    }

    private long readUnsignedIntBigEndian(byte[] data, int offset) {
        return ((data[offset] & 0xffL) << 24)
                | ((data[offset + 1] & 0xffL) << 16)
                | ((data[offset + 2] & 0xffL) << 8)
                | (data[offset + 3] & 0xffL);
    }

    private int readUnsignedShort(byte[] data, int offset, boolean littleEndian) {
        return littleEndian
                ? readUnsignedShortLittleEndian(data, offset)
                : readUnsignedShortBigEndian(data, offset);
    }

    private long readUnsignedInt(byte[] data, int offset, boolean littleEndian) {
        return littleEndian ? readUnsignedIntLittleEndian(data, offset) : readUnsignedIntBigEndian(data, offset);
    }

    private BusinessException invalidImage() {
        return new BusinessException(
                HttpStatus.BAD_REQUEST,
                "INVALID_IMAGE",
                "Tệp tải lên không phải ảnh hợp lệ hoặc định dạng ảnh không được hỗ trợ."
        );
    }

    private void deleteTemporaryFiles(Path tempDirectory) {
        if (tempDirectory == null) {
            return;
        }
        try (var paths = Files.walk(tempDirectory)) {
            paths.sorted((left, right) -> right.compareTo(left)).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException exception) {
                    log.debug("Không thể xoá tệp xử lý ảnh tạm: {}", path, exception);
                }
            });
        } catch (IOException exception) {
            log.debug("Không thể xoá thư mục xử lý ảnh tạm: {}", tempDirectory, exception);
        }
    }

    private record ImageHeader(int width, int height, int orientation) {
    }
}
