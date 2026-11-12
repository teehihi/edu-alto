package com.edualto.ai.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CourseViewSignalRequest(
        @NotNull(message = "Mã khóa học không được để trống")
        UUID courseId
) {
}
