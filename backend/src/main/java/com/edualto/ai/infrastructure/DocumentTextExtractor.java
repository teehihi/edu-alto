package com.edualto.ai.infrastructure;

import com.edualto.ai.config.AiProperties;
import com.edualto.common.exception.BusinessException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.Writer;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class DocumentTextExtractor {

    private static final int MAX_FILE_BYTES = 5 * 1024 * 1024;
    private static final int MAX_EXPANDED_ZIP_BYTES = 20 * 1024 * 1024;
    private static final Pattern EXTRACTION_MARKER = Pattern.compile(
            "\\s*\\[(?:Đoạn\\s+\\d+|Trang\\s+\\d+|Bảng\\s+\\d+(?:,\\s*dòng\\s+\\d+)?)\\]",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern REPEATED_SPACES = Pattern.compile("[\\t ]{2,}");
    private static final Pattern EXCESSIVE_LINE_BREAKS = Pattern.compile("\\n{3,}");
    private static final Set<String> DOCX_TYPES = Set.of(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream"
    );
    private static final Set<String> DOC_TYPES = Set.of("application/msword", "application/octet-stream");
    private static final Set<String> PDF_TYPES = Set.of("application/pdf", "application/octet-stream");
    private final AiProperties properties;

    public DocumentTextExtractor(AiProperties properties) {
        this.properties = properties;
        ZipSecureFile.setMinInflateRatio(0.01);
        ZipSecureFile.setMaxEntrySize(MAX_EXPANDED_ZIP_BYTES);
        ZipSecureFile.setMaxTextSize(MAX_EXPANDED_ZIP_BYTES);
    }

    public String extract(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalid("Hãy chọn tệp Word (.doc/.docx) hoặc PDF để nhập giáo trình");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw invalid("Tệp nhập không được vượt quá 5 MB");
        }
        String filename = file.getOriginalFilename();
        String extension = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        String contentType = file.getContentType();
        contentType = contentType == null ? "application/octet-stream" : contentType.toLowerCase(Locale.ROOT);
        boolean doc = extension.endsWith(".doc");
        boolean docx = extension.endsWith(".docx");
        boolean pdf = extension.endsWith(".pdf");
        if ((!doc && !docx && !pdf)
                || (doc && !DOC_TYPES.contains(contentType))
                || (docx && !DOCX_TYPES.contains(contentType))
                || (pdf && !PDF_TYPES.contains(contentType))) {
            throw invalid("Chỉ hỗ trợ tệp Word (.doc, .docx) và PDF (.pdf)");
        }
        try (InputStream stream = file.getInputStream()) {
            byte[] bytes = stream.readNBytes(MAX_FILE_BYTES + 1);
            if (bytes.length > MAX_FILE_BYTES) {
                throw invalid("Tệp nhập không được vượt quá 5 MB");
            }
            int maxChars = Math.max(1000, Math.min(properties.maxImportChars(), 100000));
            String result;
            if (docx) {
                if (bytes.length < 4 || bytes[0] != 'P' || bytes[1] != 'K' || bytes[2] != 3 || bytes[3] != 4) {
                    throw invalid("Nội dung tệp không phải tài liệu Word hợp lệ");
                }
                validateDocxArchive(bytes);
                result = extractDocx(bytes, maxChars);
            } else if (doc) {
                if (!isOle2Document(bytes)) {
                    throw invalid("Nội dung tệp không phải tài liệu Word .doc hợp lệ");
                }
                result = extractDoc(bytes, maxChars);
            } else {
                if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F' || bytes[4] != '-') {
                    throw invalid("Nội dung tệp không phải tài liệu PDF hợp lệ");
                }
                result = extractPdf(bytes, maxChars);
            }
            if (result.replaceAll("\\[[^\\]]+\\]", "").isBlank()) {
                throw invalid("Tệp không có nội dung văn bản để phân tích");
            }
            String cleanText = EXTRACTION_MARKER.matcher(result).replaceAll("")
                    .replace("\r\n", "\n").replace('\r', '\n');
            return EXCESSIVE_LINE_BREAKS.matcher(REPEATED_SPACES.matcher(cleanText).replaceAll(" "))
                    .replaceAll("\n\n").trim();
        } catch (InvalidPasswordException exception) {
            throw invalid("PDF đang được bảo vệ bằng mật khẩu. Hãy bỏ mật khẩu trước khi tải lên");
        } catch (TextLimitException exception) {
            throw invalid("Tài liệu quá dài để nhập trong một lần. Hãy chia thành các tệp nhỏ hơn");
        } catch (IOException | RuntimeException exception) {
            if (exception instanceof BusinessException businessException) throw businessException;
            throw invalid("Không đọc được tài liệu. Hãy kiểm tra tệp Word (.doc/.docx) hoặc PDF và tải lại");
        }
    }

    private boolean isOle2Document(byte[] bytes) {
        byte[] signature = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
        if (bytes.length < signature.length) return false;
        for (int i = 0; i < signature.length; i++) {
            if (bytes[i] != signature[i]) return false;
        }
        return true;
    }

    private String extractDoc(byte[] bytes, int maxChars) throws IOException {
        LimitedTextWriter writer = new LimitedTextWriter(maxChars);
        try (WordExtractor extractor = new WordExtractor(new ByteArrayInputStream(bytes))) {
            String[] paragraphs = extractor.getParagraphText();
            for (int i = 0; i < paragraphs.length; i++) {
                String paragraph = paragraphs[i]
                        .replace('\u0007', ' ')
                        .replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", "")
                        .trim();
                if (paragraph.isBlank()) continue;
                writer.append(paragraph);
                writer.append("\n\n");
            }
        }
        return writer.text();
    }

    private void validateDocxArchive(byte[] bytes) throws IOException {
        Set<String> names = new HashSet<>();
        long totalBytes = 0;
        byte[] buffer = new byte[8192];
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!names.add(entry.getName()) || names.size() > 512 || entry.getName().contains("..")) {
                    throw invalid("Cấu trúc tài liệu Word không hợp lệ");
                }
                int count;
                while ((count = zip.read(buffer)) != -1) {
                    totalBytes += count;
                    if (totalBytes > MAX_EXPANDED_ZIP_BYTES) {
                        throw invalid("Tài liệu Word vượt quá giới hạn giải nén cho phép");
                    }
                }
            }
        }
        if (!names.contains("word/document.xml") || !names.contains("[Content_Types].xml")) {
            throw invalid("Tệp không có nội dung tài liệu Word hợp lệ");
        }
    }

    private String extractDocx(byte[] bytes, int maxChars) throws IOException {
        LimitedTextWriter writer = new LimitedTextWriter(maxChars);
        try (XWPFDocument document = new XWPFDocument(new ByteArrayInputStream(bytes))) {
            for (IBodyElement element : document.getBodyElements()) {
                if (element instanceof XWPFParagraph paragraph && !paragraph.getText().isBlank()) {
                    writer.append(paragraph.getText());
                    writer.append("\n\n");
                } else if (element instanceof XWPFTable table) {
                    for (XWPFTableRow row : table.getRows()) {
                        boolean first = true;
                        for (XWPFTableCell cell : row.getTableCells()) {
                            if (!first) writer.append(" | ");
                            writer.append(cell.getText());
                            first = false;
                        }
                        writer.append("\n\n");
                    }
                }
            }
        }
        return writer.text();
    }

    private String extractPdf(byte[] bytes, int maxChars) throws IOException {
        LimitedTextWriter writer = new LimitedTextWriter(maxChars);
        try (PDDocument document = Loader.loadPDF(bytes)) {
            if (document.isEncrypted()) {
                throw invalid("PDF đang được mã hóa. Hãy dùng bản PDF không có mật khẩu");
            }
            int maxPages = Math.max(1, Math.min(properties.maxImportPages(), 100));
            if (document.getNumberOfPages() > maxPages) {
                throw invalid("PDF không được vượt quá " + maxPages + " trang. Hãy chia tài liệu thành các tệp nhỏ hơn");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            for (int page = 1; page <= document.getNumberOfPages(); page++) {
                int before = writer.length();
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                stripper.writeText(document, writer);
                String pageText = writer.text().substring(before).trim();
                if (pageText.length() < 10 && document.getPage(page - 1).getResources() != null
                        && document.getPage(page - 1).getResources().getXObjectNames().iterator().hasNext()) {
                    throw invalid("PDF có trang scan hoặc ảnh chưa nhận diện chữ. Hãy dùng OCR hoặc tải bản Word/PDF có văn bản");
                }
                writer.append("\n\n");
            }
        }
        if (writer.text().trim().length() < 20) {
            throw invalid("PDF không có đủ văn bản để phân tích. Hãy dùng OCR cho bản scan hoặc tải tệp Word");
        }
        return writer.text();
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CURRICULUM_DOCUMENT", message);
    }

    private static class TextLimitException extends IOException { }

    private static class LimitedTextWriter extends Writer {
        private final int maxChars;
        private final StringBuilder buffer = new StringBuilder();

        LimitedTextWriter(int maxChars) { this.maxChars = maxChars; }

        @Override
        public void write(char[] characters, int offset, int length) throws IOException {
            if (buffer.length() + length > maxChars) throw new TextLimitException();
            buffer.append(characters, offset, length);
        }

        @Override
        public void flush() { }

        @Override
        public void close() { }

        String text() { return buffer.toString(); }
        int length() { return buffer.length(); }
    }
}
