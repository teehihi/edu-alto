package com.edualto.review.dto;

import jakarta.validation.constraints.NotNull;

public record ReviewVisibilityRequest(@NotNull Boolean published) {
}
