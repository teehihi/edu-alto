package com.edualto.ai.dto;

import com.edualto.course.domain.CourseLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;

public record UpdateLearningPreferencesRequest(
        @Size(max = 12, message = "Vui lòng chọn tối đa 12 chủ đề quan tâm")
        List<@Size(min = 2, max = 60, message = "Tên chủ đề phải từ 2 đến 60 ký tự") String> preferredTopics,

        CourseLevel preferredLevel,

        @Size(max = 500, message = "Mục tiêu học tập không được vượt quá 500 ký tự")
        String learningGoal,

        @Min(value = 1, message = "Thời lượng học mục tiêu tối thiểu 1 giờ mỗi tuần")
        @Max(value = 80, message = "Thời lượng học mục tiêu tối đa 80 giờ mỗi tuần")
        Integer weeklyTargetHours,

        Boolean personalizationEnabled
) {
}
