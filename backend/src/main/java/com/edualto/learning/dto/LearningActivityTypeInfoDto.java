package com.edualto.learning.dto;

import com.edualto.learning.domain.LearningActivityType;

public record LearningActivityTypeInfoDto(
        LearningActivityType type,
        String name,
        String displayName,
        String category
) {
    public static LearningActivityTypeInfoDto from(LearningActivityType type) {
        return new LearningActivityTypeInfoDto(
                type,
                type.name(),
                type.displayName(),
                type.category()
        );
    }
}
