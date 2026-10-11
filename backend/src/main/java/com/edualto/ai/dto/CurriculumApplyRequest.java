package com.edualto.ai.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CurriculumApplyRequest(
        @NotEmpty(message = "Hãy chọn ít nhất một chương để thêm vào giáo trình")
        @Size(max = 20, message = "Mỗi lần nhập không được vượt quá 20 chương")
        List<@NotNull @Valid CurriculumChapterDto> chapters
) { }
