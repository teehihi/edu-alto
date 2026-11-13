package com.edualto.analytics.dto;

public record StudentCompletionPredictionDto(
        double completionProbability,
        int completionPercentage,
        double atRiskProbability,
        String riskLevel,
        String statusBadge,
        String badgeColor,
        String primaryFactor,
        String primaryFactorLabel,
        String estimatedCompletionDate,
        String priorityActionTitle,
        String priorityActionHref,
        String priorityActionLabel
) {
}
