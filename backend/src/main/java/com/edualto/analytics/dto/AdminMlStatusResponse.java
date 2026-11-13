package com.edualto.analytics.dto;

import java.time.Instant;
import java.util.List;

public record AdminMlStatusResponse(
        String status,
        String championModel,
        Double rocUtc,
        Double f1Score,
        Double accuracy,
        Integer trainSamples,
        Integer testSamples,
        Instant lastRunStartedAt,
        Instant lastRunFinishedAt,
        String lastRunMessage,
        boolean running,
        List<String> topPredictiveFeatures
) {
}
