package com.edualto.ai.infrastructure;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class QuizSourceRetriever {

    private static final int MAX_CHUNK_CHARS = 1200;
    private static final int CHUNK_OVERLAP_CHARS = 120;
    private static final Pattern WORDS = Pattern.compile("[a-z0-9]{2,}");
    private static final Set<String> STOP_WORDS = Set.of(
            "va", "la", "cua", "cac", "nhung", "trong", "tren", "cho", "voi", "mot",
            "duoc", "nhu", "nay", "do", "the", "den", "khi", "tai", "tu", "co", "khong",
            "bai", "hoc", "ten", "mo", "ta", "noi", "dung", "hay", "giup", "please", "what",
            "which", "where", "when", "from", "that", "this", "with", "about", "into", "your"
    );

    public String retrieveContext(
            List<SourceDocument> sources,
            String query,
            int maxContextChars,
            int maxPassages
    ) {
        List<Candidate> candidates = new ArrayList<>();
        for (int sourceIndex = 0; sourceIndex < sources.size(); sourceIndex++) {
            SourceDocument source = sources.get(sourceIndex);
            List<String> chunks = split(source.text());
            for (int chunkIndex = 0; chunkIndex < chunks.size(); chunkIndex++) {
                candidates.add(new Candidate(source.label(), sourceIndex, chunkIndex, chunks.get(chunkIndex), 0));
            }
        }
        if (candidates.isEmpty()) return "";

        Set<String> queryTerms = terms(query);
        List<Candidate> ranked = rank(candidates, queryTerms);
        List<Candidate> selected = selectDiverse(ranked, maxPassages);
        return render(selected, maxContextChars);
    }

    private List<Candidate> rank(List<Candidate> candidates, Set<String> queryTerms) {
        if (queryTerms.isEmpty()) {
            return candidates.stream()
                    .map(candidate -> new Candidate(candidate.label(), candidate.sourceIndex(), candidate.chunkIndex(),
                            candidate.text(), informationScore(candidate.text())))
                    .sorted(Comparator.comparingDouble(Candidate::score).reversed()
                            .thenComparingInt(Candidate::sourceIndex).thenComparingInt(Candidate::chunkIndex))
                    .toList();
        }
        List<Map<String, Integer>> frequencies = new ArrayList<>();
        Map<String, Integer> documentFrequency = new HashMap<>();
        for (Candidate candidate : candidates) {
            Map<String, Integer> counts = counts(candidate.text());
            frequencies.add(counts);
            for (String term : queryTerms) {
                if (counts.containsKey(term)) documentFrequency.merge(term, 1, Integer::sum);
            }
        }
        List<Candidate> ranked = new ArrayList<>();
        for (int index = 0; index < candidates.size(); index++) {
            Candidate candidate = candidates.get(index);
            Map<String, Integer> counts = frequencies.get(index);
            double score = 0;
            for (String term : queryTerms) {
                int frequency = counts.getOrDefault(term, 0);
                if (frequency == 0) continue;
                int documents = documentFrequency.getOrDefault(term, 0);
                double inverseFrequency = Math.log(1 + (candidates.size() - documents + 0.5) / (documents + 0.5));
                score += (frequency / (frequency + 1.2)) * inverseFrequency;
            }
            ranked.add(new Candidate(candidate.label(), candidate.sourceIndex(), candidate.chunkIndex(),
                    candidate.text(), score));
        }
        ranked.sort(Comparator.comparingDouble(Candidate::score).reversed()
                .thenComparingInt(Candidate::sourceIndex).thenComparingInt(Candidate::chunkIndex));
        return List.copyOf(ranked);
    }

    private List<Candidate> selectDiverse(List<Candidate> ranked, int maxPassages) {
        List<Candidate> selected = new ArrayList<>();
        Set<String> selectedIds = new HashSet<>();
        Map<Integer, Candidate> bestBySource = new HashMap<>();
        for (Candidate candidate : ranked) bestBySource.putIfAbsent(candidate.sourceIndex(), candidate);
        bestBySource.values().stream()
                .sorted(Comparator.comparingDouble(Candidate::score).reversed()
                        .thenComparingInt(Candidate::sourceIndex))
                .limit(maxPassages)
                .forEach(candidate -> add(selected, selectedIds, candidate));
        for (Candidate candidate : ranked) {
            if (selected.size() >= maxPassages) break;
            add(selected, selectedIds, candidate);
        }
        return List.copyOf(selected);
    }

    private void add(List<Candidate> selected, Set<String> selectedIds, Candidate candidate) {
        String id = candidate.sourceIndex() + ":" + candidate.chunkIndex();
        if (selectedIds.add(id)) selected.add(candidate);
    }

    private String render(List<Candidate> passages, int maxContextChars) {
        StringBuilder context = new StringBuilder();
        for (int index = 0; index < passages.size(); index++) {
            Candidate passage = passages.get(index);
            String header = "\n\n--- " + passage.label() + " · Đoạn " + (passage.chunkIndex() + 1) + " ---\n";
            int remaining = maxContextChars - context.length();
            if (remaining <= header.length()) break;
            context.append(header);
            int passageBudget = Math.max(1, (maxContextChars - context.length()) / (passages.size() - index));
            int length = Math.min(passage.text().length(), Math.min(MAX_CHUNK_CHARS, passageBudget));
            context.append(passage.text(), 0, length);
        }
        return context.toString().strip();
    }

    private List<String> split(String text) {
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + MAX_CHUNK_CHARS, text.length());
            if (end < text.length()) {
                int boundary = text.lastIndexOf(' ', end);
                if (boundary > start + MAX_CHUNK_CHARS / 2) end = boundary;
            }
            String chunk = text.substring(start, end).trim();
            if (!chunk.isEmpty()) chunks.add(chunk);
            if (end >= text.length()) break;
            start = Math.max(start + 1, end - CHUNK_OVERLAP_CHARS);
        }
        return List.copyOf(chunks);
    }

    private Set<String> terms(String text) {
        if (text == null || text.isBlank()) return Set.of();
        String normalized = normalize(text);
        return WORDS.matcher(normalized).results()
                .map(match -> match.group())
                .filter(term -> !STOP_WORDS.contains(term))
                .collect(Collectors.toUnmodifiableSet());
    }

    private Map<String, Integer> counts(String text) {
        Map<String, Integer> counts = new HashMap<>();
        WORDS.matcher(normalize(text)).results()
                .map(match -> match.group())
                .filter(term -> !STOP_WORDS.contains(term))
                .forEach(term -> counts.merge(term, 1, Integer::sum));
        return counts;
    }

    private double informationScore(String text) {
        Set<String> uniqueTerms = terms(text);
        return uniqueTerms.size() / Math.sqrt(Math.max(1, text.length()));
    }

    private String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
    }

    public record SourceDocument(String label, String text) { }

    private record Candidate(String label, int sourceIndex, int chunkIndex, String text, double score) { }
}
