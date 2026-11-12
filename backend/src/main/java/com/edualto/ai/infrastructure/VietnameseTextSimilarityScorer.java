package com.edualto.ai.infrastructure;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class VietnameseTextSimilarityScorer {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_ALNUM = Pattern.compile("[^\\p{Alnum}]+");

    private static final Set<String> STOP_WORDS = Set.copyOf(Arrays.asList(
            "va", "cua", "cho", "voi", "la", "cac", "nhung", "mot", "trong", "khi", "tu", "den",
            "de", "ban", "hoc", "khoa", "bai", "phan", "thuc", "hanh", "co", "nang", "cao",
            "toan", "dien", "nhu", "the", "nao", "ve", "qua", "tai", "day", "nay", "tren", "duoi",
            "sau", "truoc", "cung", "duoc", "khong", "da", "se", "dang", "moi", "nhieu", "huong", "dan",
            "and", "for", "with", "from", "that", "this", "into", "your", "you", "are",
            "how", "what", "why", "course", "courses", "learn", "learning", "lesson", "lessons",
            "tutorial", "guide", "complete", "beginner", "intermediate", "advanced", "master"
    ));

    private VietnameseTextSimilarityScorer() {
    }

    public static String normalizeText(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }
        String replaced = input.replace('đ', 'd').replace('Đ', 'D');
        String decomposed = Normalizer.normalize(replaced, Normalizer.Form.NFD);
        String stripped = DIACRITICS.matcher(decomposed).replaceAll("");
        return stripped.toLowerCase(Locale.ROOT).trim();
    }

    public static List<String> tokenize(String input) {
        String normalized = normalizeText(input);
        if (normalized.isEmpty()) {
            return List.of();
        }
        String[] rawTokens = NON_ALNUM.split(normalized);
        return Arrays.stream(rawTokens)
                .filter(token -> token.length() >= 2)
                .filter(token -> !STOP_WORDS.contains(token))
                .toList();
    }

    public static Map<String, Double> buildWeightedTermFrequency(
            String title,
            String tagline,
            String description
    ) {
        Map<String, Double> counts = new HashMap<>();
        addTokens(counts, tokenize(title), 3.0);
        addTokens(counts, tokenize(tagline), 2.0);
        addTokens(counts, tokenize(description), 1.0);
        return normalizeTermFrequencies(counts);
    }

    public static Map<String, Double> buildWeightedTermFrequency(Map<String, Double> textWithWeights) {
        Map<String, Double> counts = new HashMap<>();
        if (textWithWeights == null || textWithWeights.isEmpty()) {
            return Map.of();
        }
        for (Map.Entry<String, Double> entry : textWithWeights.entrySet()) {
            if (entry.getKey() == null || entry.getValue() == null || entry.getValue() <= 0.0) {
                continue;
            }
            addTokens(counts, tokenize(entry.getKey()), entry.getValue());
        }
        return normalizeTermFrequencies(counts);
    }

    public static Map<String, Double> computeIdf(Collection<Map<String, Double>> documents) {
        if (documents == null || documents.isEmpty()) {
            return Map.of();
        }
        int totalDocs = documents.size();
        Map<String, Integer> documentFrequencies = new HashMap<>();
        for (Map<String, Double> doc : documents) {
            if (doc == null || doc.isEmpty()) {
                continue;
            }
            Set<String> seen = new HashSet<>(doc.keySet());
            for (String term : seen) {
                documentFrequencies.merge(term, 1, Integer::sum);
            }
        }
        Map<String, Double> idf = new HashMap<>(documentFrequencies.size());
        for (Map.Entry<String, Integer> entry : documentFrequencies.entrySet()) {
            double value = Math.log((totalDocs + 1.0) / (entry.getValue() + 1.0)) + 1.0;
            idf.put(entry.getKey(), value);
        }
        return idf;
    }

    public static Map<String, Double> toTfIdfVector(
            Map<String, Double> tfVector,
            Map<String, Double> idfMap
    ) {
        if (tfVector == null || tfVector.isEmpty()) {
            return Map.of();
        }
        Map<String, Double> vector = new LinkedHashMap<>();
        for (Map.Entry<String, Double> entry : tfVector.entrySet()) {
            double idf = idfMap.getOrDefault(entry.getKey(), 1.0);
            vector.put(entry.getKey(), entry.getValue() * idf);
        }
        return vector;
    }

    public static double cosineSimilarity(Map<String, Double> left, Map<String, Double> right) {
        if (left == null || right == null || left.isEmpty() || right.isEmpty()) {
            return 0.0;
        }
        Map<String, Double> smaller = left.size() <= right.size() ? left : right;
        Map<String, Double> larger = left.size() <= right.size() ? right : left;

        double dot = 0.0;
        for (Map.Entry<String, Double> entry : smaller.entrySet()) {
            Double other = larger.get(entry.getKey());
            if (other != null) {
                dot += entry.getValue() * other;
            }
        }
        if (dot <= 0.0) {
            return 0.0;
        }
        double leftNorm = l2Norm(left);
        double rightNorm = l2Norm(right);
        if (leftNorm == 0.0 || rightNorm == 0.0) {
            return 0.0;
        }
        return Math.min(1.0, dot / (leftNorm * rightNorm));
    }

    public static String findBestMatchingTopic(List<String> topics, String targetText) {
        if (topics == null || topics.isEmpty() || targetText == null || targetText.isBlank()) {
            return null;
        }
        String normalizedTarget = normalizeText(targetText);
        Set<String> targetTokens = new HashSet<>(tokenize(targetText));
        if (targetTokens.isEmpty()) {
            return null;
        }

        String bestTopic = null;
        double bestOverlap = 0.0;
        for (String topic : topics) {
            if (topic == null || topic.isBlank()) {
                continue;
            }
            String normalizedTopic = normalizeText(topic);
            if (normalizedTopic.length() >= 2 && normalizedTarget.contains(normalizedTopic)) {
                return topic.trim();
            }
            List<String> topicTokens = tokenize(topic);
            if (topicTokens.isEmpty()) {
                continue;
            }
            long matched = topicTokens.stream().filter(targetTokens::contains).count();
            if (matched > 0) {
                double ratio = (double) matched / topicTokens.size();
                if (ratio > bestOverlap) {
                    bestOverlap = ratio;
                    bestTopic = topic.trim();
                }
            }
        }
        return bestOverlap >= 0.45 ? bestTopic : null;
    }

    private static void addTokens(Map<String, Double> counts, List<String> tokens, double weight) {
        for (String token : tokens) {
            counts.merge(token, weight, Double::sum);
        }
    }

    private static Map<String, Double> normalizeTermFrequencies(Map<String, Double> rawCounts) {
        double totalWeight = 0.0;
        for (double val : rawCounts.values()) {
            totalWeight += val;
        }
        if (totalWeight <= 0.0) {
            return Map.of();
        }
        Map<String, Double> normalized = new HashMap<>(rawCounts.size());
        for (Map.Entry<String, Double> entry : rawCounts.entrySet()) {
            normalized.put(entry.getKey(), entry.getValue() / totalWeight);
        }
        return normalized;
    }

    private static double l2Norm(Map<String, Double> vector) {
        double sumSq = 0.0;
        for (double val : vector.values()) {
            sumSq += val * val;
        }
        return Math.sqrt(sumSq);
    }
}
