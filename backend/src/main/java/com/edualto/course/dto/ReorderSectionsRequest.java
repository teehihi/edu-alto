package com.edualto.course.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ReorderSectionsRequest(
        @NotEmpty(message = "Danh sách sắp xếp chương học không được để trống")
        @Valid
        List<ReorderItemRequest> items
) {
}
