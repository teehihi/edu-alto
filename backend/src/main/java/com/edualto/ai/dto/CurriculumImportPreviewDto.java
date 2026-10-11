package com.edualto.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CurriculumImportPreviewDto(
        @NotEmpty(message = "Bản xem trước cần ít nhất một chương học")
        @Size(max = 20, message = "Mỗi lần nhập không được vượt quá 20 chương")
        List<@NotNull @Valid CurriculumChapterDto> chapters,
        @NotNull(message = "Danh sách lưu ý không được để trống")
        @Size(max = 20, message = "Danh sách lưu ý vượt quá giới hạn cho phép")
        List<@NotNull @Size(max = 1000) String> warnings
) { }
