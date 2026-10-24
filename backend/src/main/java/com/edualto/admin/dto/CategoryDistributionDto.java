package com.edualto.admin.dto;

public record CategoryDistributionDto(
        String name,
        long count,
        int percentage,
        String color
) {
}
