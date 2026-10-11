package com.edualto.ai.dto;

import java.util.List;

public record AiChatResponse(String answer, List<Source> sources, String model) {
    public record Source(String id, String title, String url) { }
}
