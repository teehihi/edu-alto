package com.edualto.ai.dto;

import java.util.UUID;

public record CurriculumImportJobResponse(
        UUID id,
        String status,
        CurriculumImportPreviewDto preview,
        String message
) { }
