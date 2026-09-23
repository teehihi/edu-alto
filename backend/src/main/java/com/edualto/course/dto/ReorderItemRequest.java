package com.edualto.course.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ReorderItemRequest(
        @NotNull(message = "ID không được để trống")
        UUID id,

        @NotNull(message = "Vị trí không được để trống")
        @Min(value = 1, message = "Vị trí phải lớn hơn hoặc bằng 1")
        Integer position
) {
}
