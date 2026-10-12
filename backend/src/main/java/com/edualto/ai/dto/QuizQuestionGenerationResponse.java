package com.edualto.ai.dto;

import java.util.List;

public record QuizQuestionGenerationResponse(List<GeneratedQuestion> questions) {

    public record GeneratedQuestion(String prompt, List<GeneratedOption> options) { }

    public record GeneratedOption(String label, boolean correct) { }
}
