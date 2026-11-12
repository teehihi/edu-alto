package com.edualto.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record RecommendationFeedbackRequest(
        UUID snapshotId,
        UUID recommendationItemId,

        @NotBlank(message = "Loại đối tượng phản hồi không được để trống")
        @Pattern(regexp = "COURSE|LESSON|QUIZ_REVIEW", message = "Loại đối tượng phản hồi không hợp lệ")
        String targetType,

        @NotNull(message = "Mã đối tượng phản hồi không được để trống")
        UUID targetId,

        @NotBlank(message = "Loại phản hồi không được để trống")
        @Pattern(regexp = "CLICKED|STARTED|DISMISSED|HELPFUL", message = "Loại phản hồi không hợp lệ")
        String feedbackType
) {
}
