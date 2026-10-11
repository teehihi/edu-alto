package com.edualto.ai.service;

import com.edualto.common.exception.BusinessException;
import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class EducationPolicyService {
    public record PolicyDocument(String code, String title, String url, String kind, String summary) { }
    public record PolicyResponse(List<PolicyDocument> references, List<String> notes, String verifiedAt,
            List<String> suggestedSections, List<String> suggestedActivities, Integer minutesPerPeriod) { }
    private record Rule(PolicyDocument document, Set<String> levels, int fromSchoolYear) { }
    private static final Set<String> LEVELS = Set.of("PRIMARY", "LOWER_SECONDARY", "UPPER_SECONDARY",
            "HIGHER_EDUCATION", "VOCATIONAL", "OTHER");
    private final ObjectMapper mapper;
    private final List<Rule> rules;
    private final String verifiedAt;

    public EducationPolicyService(ObjectMapper mapper) {
        this.mapper = mapper;
        try (InputStream stream = new ClassPathResource("ai/education-policy-catalog.json").getInputStream()) {
            JsonNode catalog = mapper.readTree(stream);
            verifiedAt = catalog.path("verifiedAt").asString();
            List<Rule> loaded = new ArrayList<>();
            for (JsonNode node : catalog.path("documents")) {
                Set<String> levels = new LinkedHashSet<>();
                for (JsonNode level : node.path("levels")) levels.add(level.asString());
                PolicyDocument doc = new PolicyDocument(node.path("code").asString(), node.path("title").asString(),
                        node.path("url").asString(), node.path("kind").asString(), node.path("summary").asString());
                loaded.add(new Rule(doc, Set.copyOf(levels), node.path("fromSchoolYear").asInt()));
            }
            rules = List.copyOf(loaded);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load education policy catalog", exception);
        }
    }

    public PolicyResponse select(String level, String subject, String grade, String schoolYear) {
        if (!LEVELS.contains(level) || subject.length() > 160 || grade.length() > 32
                || !schoolYear.matches("\\d{4}-\\d{4}")) {
            throw invalid("Thông tin cấp học, môn, lớp hoặc năm học chưa hợp lệ.");
        }
        int year = Integer.parseInt(schoolYear.substring(0, 4));
        if (Integer.parseInt(schoolYear.substring(5)) != year + 1) throw invalid("Năm học cần có hai năm liên tiếp.");
        List<String> notes = new ArrayList<>();
        int gradeNumber = parseGrade(grade);
        int minimum = "PRIMARY".equals(level) ? 1 : "LOWER_SECONDARY".equals(level) ? 6 : 10;
        int maximum = "PRIMARY".equals(level) ? 5 : "LOWER_SECONDARY".equals(level) ? 9 : 12;
        boolean general = Set.of("PRIMARY", "LOWER_SECONDARY", "UPPER_SECONDARY").contains(level);
        if (general && !grade.isBlank() && (gradeNumber < minimum || gradeNumber > maximum)) {
            throw invalid("Lớp/khối không phù hợp với cấp học đã chọn.");
        }
        if (general && grade.isBlank()) notes.add("Chọn lớp/khối để đối chiếu chính xác các sửa đổi theo môn và lớp.");
        if (year < 2024) notes.add("Bảng tra hiện hỗ trợ chương trình triển khai đầy đủ từ năm học 2024–2025; tài liệu cũ cần đối chiếu lộ trình riêng.");
        if (year > 2026) notes.add("Nguồn được kiểm tra ngày 11/10/2026; cần kiểm tra văn bản ban hành sau mốc này cho năm học tương lai.");
        String normalizedSubject = normalize(subject);
        List<PolicyDocument> references = rules.stream()
                .filter(rule -> rule.levels().contains(level) && year >= rule.fromSchoolYear())
                .filter(rule -> !rule.document().code().equals("3588/QĐ-BGDĐT"))
                .filter(rule -> !rule.document().code().equals("17/2025/TT-BGDĐT")
                        || affectedBy2025(level, normalizedSubject, gradeNumber))
                .map(Rule::document).toList();
        if (!general) {
            notes.add("Môn chuyên ngành cần chuẩn đầu ra, đề cương và giáo trình được cơ sở đào tạo phê duyệt. Các văn bản khung không xác định tự động từng sách/mô-đun chuyên ngành.");
            if ("OTHER".equals(level)) notes.add("Chương trình khác chưa có bộ quy tắc được kiểm chứng; nhập theo nội dung gốc của tài liệu.");
            if ("VOCATIONAL".equals(level) && year >= 2026) notes.add("79/2026 có hiệu lực 10/11/2026; 82/2026 về chương trình, giáo trình môn học chung có hiệu lực 15/11/2026. Không áp văn bản chưa đến ngày hiệu lực.");
        } else {
            notes.add("Các văn bản được chọn theo phạm vi cấp học/môn/lớp; đây là nguồn tham chiếu để nhập bản nháp, không phải kết luận tài liệu đã đáp ứng đầy đủ quy định.");
            if (normalizedSubject.isBlank()) notes.add("Chọn môn học để lọc sửa đổi chương trình có liên quan.");
            if (!normalizedSubject.isBlank() && !recognizedSubject(level, normalizedSubject)) {
                notes.add("Môn học chưa khớp danh mục phổ thông đã đối chiếu. Chỉ có nguồn khung chung; cần kiểm tra chương trình môn cụ thể hoặc chọn cấp học khác.");
            }
            notes.add("Bộ sách là thông tin tham khảo tùy chọn; các văn bản được chọn theo cấp học, môn, lớp và năm học.");
        }
        List<String> sections = !general ? List.of("Chuẩn đầu ra", "Nội dung", "Hoạt động học tập", "Đánh giá")
                : "PRIMARY".equals(level) ? List.of("Yêu cầu cần đạt", "Đồ dùng dạy học", "Hoạt động dạy học", "Điều chỉnh sau bài dạy")
                : List.of("Mục tiêu: kiến thức, năng lực, phẩm chất", "Thiết bị và học liệu", "Tiến trình dạy học");
        List<String> activities = general && !"PRIMARY".equals(level)
                ? List.of("Mở đầu / xác định nhiệm vụ", "Hình thành kiến thức", "Luyện tập", "Vận dụng") : List.of();
        boolean ordinaryProgram = general && year >= 2024;
        Integer minutesPerPeriod = ordinaryProgram ? ("PRIMARY".equals(level) ? 35 : 45) : null;
        if (minutesPerPeriod != null) notes.add("Chương trình phổ thông quy định một tiết tiểu học 35 phút, trung học 45 phút. Chỉ quy đổi khi tài liệu ghi rõ số tiết; một bài có thể gồm nhiều tiết, và đây không phải độ dài video.");
        return new PolicyResponse(references, List.copyOf(notes), verifiedAt, sections, activities, minutesPerPeriod);
    }

    public String contextFor(String level, String subject, String grade, String schoolYear) {
        return mapper.writeValueAsString(select(level, subject, grade, schoolYear));
    }

    public Integer minutesPerPeriodFor(String level, String schoolYear) {
        if (!LEVELS.contains(level) || schoolYear == null || !schoolYear.matches("\\d{4}-\\d{4}")) {
            return null;
        }
        int year = Integer.parseInt(schoolYear.substring(0, 4));
        boolean generalProgram = Set.of("PRIMARY", "LOWER_SECONDARY", "UPPER_SECONDARY").contains(level);
        if (!generalProgram || year < 2024) return null;
        return "PRIMARY".equals(level) ? 35 : 45;
    }

    public List<String> planWarnings(String level, String source) {
        String text = normalize(source);
        List<String> warnings = new ArrayList<>();
        if ("LOWER_SECONDARY".equals(level) || "UPPER_SECONDARY".equals(level)) {
            if (!(text.contains("mo dau") || text.contains("khoi dong") || text.contains("xac dinh van de"))) warnings.add("Chưa thấy nhãn hoạt động mở đầu trong tài liệu; hãy rà lại khung tham khảo 5512.");
            if (!(text.contains("hinh thanh kien thuc") || text.contains("kham pha") || text.contains("kien thuc moi"))) warnings.add("Chưa thấy nhãn hoạt động hình thành kiến thức; đây là lưu ý rà soát, không kết luận thiếu hoạt động.");
            if (!(text.contains("luyen tap") || text.contains("thuc hanh"))) warnings.add("Chưa thấy nhãn hoạt động luyện tập/thực hành trong tài liệu.");
            if (!text.contains("van dung")) warnings.add("Chưa thấy nhãn hoạt động vận dụng trong tài liệu.");
        }
        if ("PRIMARY".equals(level) && !(text.contains("yeu cau can dat") || text.contains("muc tieu"))) warnings.add("Chưa thấy mục yêu cầu cần đạt/mục tiêu; hãy rà lại hướng dẫn tiểu học 2345.");
        if (Set.of("PRIMARY", "LOWER_SECONDARY", "UPPER_SECONDARY").contains(level)
                && !(text.contains("danh gia") || text.contains("nhan xet") || text.contains("kiem tra"))) warnings.add("Chưa thấy nội dung đánh giá trong tài liệu; hãy kiểm tra hoạt động đánh giá thường xuyên.");
        return List.copyOf(warnings);
    }

    public List<PolicyDocument> search(String message) {
        String question = normalize(message);
        if (!question.matches(".*(thong tu|cong van|bo sach|sach giao khoa|giao an|ke hoach bai day|thoi luong|tiet hoc|tieu hoc|thcs|thpt|5512|2345|3588).*")) {
            return List.of();
        }
        String level = question.contains("tieu hoc") ? "PRIMARY"
                : question.contains("thcs") || question.contains("trung hoc co so") ? "LOWER_SECONDARY"
                : question.contains("thpt") || question.contains("trung hoc pho thong") ? "UPPER_SECONDARY" : "";
        return rules.stream().filter(rule -> level.isBlank() || rule.levels().contains(level))
                .sorted((left, right) -> Integer.compare(score(right.document(), question), score(left.document(), question)))
                .limit(5).map(Rule::document).toList();
    }

    private static int score(PolicyDocument document, String question) {
        String searchable = normalize(document.code() + " " + document.title());
        int count = question.contains(normalize(document.code())) ? 20 : 0;
        for (String word : question.split("\\s+")) if (word.length() > 2 && searchable.contains(word)) count++;
        return count;
    }

    private static boolean affectedBy2025(String level, String subject, int grade) {
        if (subject.isBlank()) return false;
        if (!"UPPER_SECONDARY".equals(level)) return subject.contains("lich su") || subject.contains("dia li");
        return (grade == 12 || grade == 0) && subject.contains("dia li")
                || (grade == 10 || grade == 0) && (subject.contains("lich su") || subject.contains("cong dan")
                || subject.contains("kinh te") || subject.contains("phap luat"));
    }

    private static int parseGrade(String value) {
        String cleaned = normalize(value).replaceFirst("^(lop|khoi)\\s*", "").trim();
        if (!cleaned.matches("\\d{1,2}")) return 0;
        return Integer.parseInt(cleaned);
    }

    private static boolean recognizedSubject(String level, String subject) {
        List<String> names = switch (level) {
            case "PRIMARY" -> List.of("tieng viet", "toan", "dao duc", "ngoai ngu", "tieng anh", "tu nhien va xa hoi",
                    "lich su", "dia li", "khoa hoc", "tin hoc", "cong nghe", "the chat", "am nhac", "mi thuat", "my thuat", "nghe thuat", "trai nghiem");
            case "LOWER_SECONDARY" -> List.of("ngu van", "toan", "ngoai ngu", "tieng anh", "cong dan", "lich su", "dia li",
                    "khoa hoc tu nhien", "tin hoc", "cong nghe", "the chat", "am nhac", "mi thuat", "my thuat", "nghe thuat", "trai nghiem", "dia phuong");
            default -> List.of("ngu van", "toan", "ngoai ngu", "tieng anh", "lich su", "dia li", "vat li", "vat ly", "hoa hoc", "sinh hoc",
                    "kinh te", "phap luat", "cong dan", "tin hoc", "cong nghe", "the chat", "am nhac", "mi thuat", "my thuat", "quoc phong", "trai nghiem", "dia phuong");
        };
        return names.stream().anyMatch(subject::contains);
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_EDUCATION_PROFILE", message);
    }
}
