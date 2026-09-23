package com.edualto.common.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class SlugUtils {

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s+]");
    private static final Pattern MULTIPLE_HYPHENS = Pattern.compile("-{2,}");

    private SlugUtils() {
    }

    public static String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }

        String normalized = input.trim();
        // Replace Vietnamese specific characters
        normalized = normalized.replace("đ", "d").replace("Đ", "d");

        // Decompose diacritics
        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        // Replace whitespace with hyphens
        String noWhitespace = WHITESPACE.matcher(normalized).replaceAll("-");

        // Normalize non-latin characters
        String slug = NON_LATIN.matcher(noWhitespace).replaceAll("");

        // Collapse multiple hyphens
        slug = MULTIPLE_HYPHENS.matcher(slug).replaceAll("-");

        // Convert to lowercase
        slug = slug.toLowerCase(Locale.ENGLISH);

        // Remove leading and trailing hyphens
        slug = slug.replaceAll("^-+|-+$", "");

        // Cap length to 200 characters if needed
        if (slug.length() > 200) {
            slug = slug.substring(0, 200).replaceAll("^-+|-+$", "");
        }

        return slug;
    }
}
