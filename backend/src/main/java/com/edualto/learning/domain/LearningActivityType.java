package com.edualto.learning.domain;

public enum LearningActivityType {
    // Course lifecycle
    COURSE_ENROLLED("Ghi danh khóa học", "COURSE"),
    COURSE_COMPLETED("Hoàn thành khóa học", "COURSE"),
    CERTIFICATE_ISSUED("Được cấp chứng chỉ", "COURSE"),

    // Lesson lifecycle
    LESSON_VIEWED("Xem bài học", "LESSON"),
    LESSON_COMPLETED("Hoàn thành bài học", "LESSON"),
    VIDEO_WATCHED("Theo dõi video bài giảng", "LESSON"),
    NOTE_CREATED("Tạo ghi chú bài học", "LESSON"),
    RESOURCE_DOWNLOADED("Tải tài liệu đính kèm", "LESSON"),

    // Assessment lifecycle
    QUIZ_STARTED("Bắt đầu làm bài kiểm tra", "ASSESSMENT"),
    QUIZ_SUBMITTED("Nộp bài kiểm tra trắc nghiệm", "ASSESSMENT"),
    ASSIGNMENT_SUBMITTED("Nộp bài tập tự luận", "ASSESSMENT"),
    ASSIGNMENT_GRADED("Được chấm điểm bài tập", "ASSESSMENT"),

    // Interaction & Discussion
    QUESTION_ASKED("Đặt câu hỏi thảo luận", "INTERACTION"),
    COMMENT_POSTED("Gửi bình luận phản hồi", "INTERACTION");

    private final String displayName;
    private final String category;

    LearningActivityType(String displayName, String category) {
        this.displayName = displayName;
        this.category = category;
    }

    public String displayName() {
        return displayName;
    }

    public String category() {
        return category;
    }
}
