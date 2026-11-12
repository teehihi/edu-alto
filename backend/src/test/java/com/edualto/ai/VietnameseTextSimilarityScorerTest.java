package com.edualto.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.edualto.ai.infrastructure.VietnameseTextSimilarityScorer;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class VietnameseTextSimilarityScorerTest {

    @Test
    void tokenizeRemovesVietnameseDiacriticsAndStopWords() {
        List<String> tokens = VietnameseTextSimilarityScorer.tokenize("Khóa học Lập trình Java & Spring Boot cho người mới");

        assertThat(tokens).contains("lap", "trinh", "java", "spring", "boot", "nguoi");
        assertThat(tokens).doesNotContain("khoa", "hoc", "cho", "moi");
    }

    @Test
    void cosineSimilarityRanksMatchingDomainHigher() {
        Map<String, Double> springCourse = VietnameseTextSimilarityScorer.buildWeightedTermFrequency(
                "Java Spring Boot Microservices",
                "Xây dựng REST API và PostgreSQL",
                "Thực hành Spring Security, JWT và Flyway migration"
        );
        Map<String, Double> designCourse = VietnameseTextSimilarityScorer.buildWeightedTermFrequency(
                "Thiết kế UI UX với Figma",
                "Design system và Prototype cho sản phẩm số",
                "Tạo wireframe, layout và trải nghiệm người dùng"
        );
        Map<String, Double> backendQuery = VietnameseTextSimilarityScorer.buildWeightedTermFrequency(
                "Java Spring Security REST API",
                "PostgreSQL backend",
                ""
        );

        Map<String, Double> idf = VietnameseTextSimilarityScorer.computeIdf(List.of(springCourse, designCourse, backendQuery));
        double simSpring = VietnameseTextSimilarityScorer.cosineSimilarity(
                VietnameseTextSimilarityScorer.toTfIdfVector(backendQuery, idf),
                VietnameseTextSimilarityScorer.toTfIdfVector(springCourse, idf)
        );
        double simDesign = VietnameseTextSimilarityScorer.cosineSimilarity(
                VietnameseTextSimilarityScorer.toTfIdfVector(backendQuery, idf),
                VietnameseTextSimilarityScorer.toTfIdfVector(designCourse, idf)
        );

        assertThat(simSpring).isGreaterThan(simDesign);
        assertThat(simSpring).isGreaterThan(0.35);
    }

    @Test
    void findBestMatchingTopicMatchesVietnameseAndEnglishTopics() {
        String matched = VietnameseTextSimilarityScorer.findBestMatchingTopic(
                List.of("UI/UX Design", "Java & Spring Boot"),
                "Làm chủ Spring Boot và RESTful API trong thực tế"
        );

        assertThat(matched).isEqualTo("Java & Spring Boot");
    }
}
