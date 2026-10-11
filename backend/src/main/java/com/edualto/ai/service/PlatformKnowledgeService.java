package com.edualto.ai.service;

import com.edualto.ai.dto.RetrievedPassage;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class PlatformKnowledgeService {
    private static final List<RetrievedPassage> FACTS = List.of(
            new RetrievedPassage("platform:about", "Giới thiệu EduAlto", "/",
                    "EduAlto là nền tảng học tập trực tuyến dành cho người dùng Việt Nam. Học viên tìm khóa học, học qua bài học và học liệu, làm bài kiểm tra/bài tập và theo dõi tiến độ. Giảng viên quản lý khóa học, chương, bài học và tương tác với học viên. Quản trị viên quản lý hệ thống."),
            new RetrievedPassage("platform:register", "Đăng ký và xác minh email", "/register",
                    "Người dùng có thể đăng ký tài khoản học viên hoặc giảng viên bằng họ tên, email và mật khẩu. Hệ thống gửi mã OTP để xác minh email. Đăng nhập trước khi sử dụng chức năng học tập cá nhân hoặc quản lý khóa học. Không cung cấp mật khẩu hay mã OTP cho chatbot."),
            new RetrievedPassage("platform:password", "Khôi phục tài khoản", "/forgot-password",
                    "Nếu quên mật khẩu, mở trang Quên mật khẩu và làm theo bước xác minh qua email để đặt mật khẩu mới. Chatbot không thể đổi mật khẩu, xác minh OTP hoặc xem dữ liệu tài khoản thay người dùng."),
            new RetrievedPassage("platform:courses", "Tìm và tham gia khóa học", "/courses",
                    "Trang Khóa học hiển thị danh mục khóa học được công bố. Người dùng có thể xem thông tin, giảng viên và giáo trình công khai; bài xem trước tùy cấu hình của khóa học. Nội dung học riêng yêu cầu đăng nhập và quyền tham gia khóa học. Giá và ưu đãi lấy từ trang khóa học tại thời điểm xem."),
            new RetrievedPassage("platform:learning", "Học tập và tiến độ", "/login",
                    "Sau khi đăng nhập và có quyền tham gia khóa học, học viên xem bài học, tài liệu, ghi chú, hoàn thành bài và làm quiz/bài tập. Chatbot của khách chưa đăng nhập chỉ trả lời thông tin tổng quan về EduAlto, không truy cập tiến độ, bài học riêng hay dữ liệu tài khoản."),
            new RetrievedPassage("platform:instructor", "Công cụ giảng viên", "/register",
                    "Giảng viên quản lý khóa học theo chương và bài học; có thể soạn nội dung hoặc nhập bản nháp từ file kế hoạch bài dạy DOC/DOCX/PDF có chữ. Chọn cấp học, môn, lớp hoặc năm đào tạo, chương trình/tài liệu tham khảo nếu có, và năm học; xem nguồn tham chiếu rồi sửa kết quả trước khi thêm vào giáo trình. Bài nhập ở trạng thái nháp. File scan cần OCR trước. Nội dung gửi Gemini có thể được Google sử dụng để cải thiện sản phẩm khi dùng Free Tier.")
    );

    public List<RetrievedPassage> retrieve(String query) {
        String question = normalize(query);
        List<RetrievedPassage> matching = FACTS.stream().filter(fact -> score(fact, question) > 0)
                .sorted(Comparator.comparingInt((RetrievedPassage fact) -> score(fact, question)).reversed())
                .limit(3).toList();
        return matching.isEmpty() ? List.of(FACTS.getFirst()) : matching;
    }

    private static int score(RetrievedPassage fact, String question) {
        String text = normalize(fact.title() + " " + fact.text());
        int result = 0;
        for (String term : question.split("[^a-z0-9]+")) {
            if (term.length() >= 3 && text.contains(term)) result++;
        }
        return result;
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
    }
}
