package com.edualto.ai.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "edualto.ai")
public record AiProperties(
        boolean enabled,
        String apiKey,
        String model,
        String fallbackModels,
        int requestTimeoutSeconds,
        int maxContextChars,
        int maxImportChars,
        int maxImportPages,
        int requestsPerMinute,
        int dailyRequestLimit
) {
    public AiProperties {
        apiKey = apiKey == null ? "" : apiKey.trim();
        model = model == null || model.isBlank() ? "gemini-3.8-flash" : model.trim();
        fallbackModels = fallbackModels == null ? "" : fallbackModels.trim();
        if (fallbackModels.equalsIgnoreCase("none")) fallbackModels = "";
        if (!model.matches("[a-zA-Z0-9._-]{1,120}")) {
            throw new IllegalArgumentException("Invalid Gemini model identifier");
        }
        for (String fallbackModel : fallbackModels.split(",")) {
            String normalizedModel = fallbackModel.trim();
            if (!normalizedModel.isEmpty() && !normalizedModel.matches("[a-zA-Z0-9._-]{1,120}")) {
                throw new IllegalArgumentException("Invalid Gemini fallback model identifier");
            }
        }
        requestTimeoutSeconds = clamp(requestTimeoutSeconds, 10, 180, 90);
        maxContextChars = clamp(maxContextChars, 1000, 40000, 18000);
        maxImportChars = clamp(maxImportChars, 1000, 100000, 40000);
        maxImportPages = clamp(maxImportPages, 1, 100, 60);
        requestsPerMinute = clamp(requestsPerMinute, 1, 60, 6);
        dailyRequestLimit = clamp(dailyRequestLimit, 1, 10000, 40);
    }

    public List<String> modelFallbackChain() {
        List<String> chain = new ArrayList<>();
        chain.add(model);
        Arrays.stream(fallbackModels.split(","))
                .map(String::trim)
                .filter(candidate -> !candidate.isEmpty() && !candidate.equals(model))
                .filter(candidate -> !chain.contains(candidate))
                .forEach(chain::add);
        return List.copyOf(chain);
    }

    private static int clamp(int value, int minimum, int maximum, int fallback) {
        return value <= 0 ? fallback : Math.clamp(value, minimum, maximum);
    }
}
