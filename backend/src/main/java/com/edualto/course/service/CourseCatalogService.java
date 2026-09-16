package com.edualto.course.service;

import com.edualto.course.dto.CourseSummaryResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CourseCatalogService {

    public List<CourseSummaryResponse> getPopularCourses() {
        return List.of(
                new CourseSummaryResponse(
                        "figma-ui-ux",
                        "Figma UI UX Design",
                        "Design",
                        "Học cách xây dựng giao diện trực quan và dễ dùng.",
                        "Phạm Văn Hậu",
                        "500.000đ",
                        4.3
                ),
                new CourseSummaryResponse(
                        "coding-basic",
                        "300 Bài Code Thiếu Nhi",
                        "Coding Basic",
                        "Các bài code nhập môn từ cơ bản đến nâng cao.",
                        "Tee",
                        "1.000.000đ",
                        5.0
                )
        );
    }
}
