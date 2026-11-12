package com.edualto.support;

import com.edualto.AbstractIntegrationTest;
import com.edualto.storage.service.StorageService;
import com.edualto.support.repository.ContactMessageRepository;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ContactIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ContactMessageRepository contactMessageRepository;

    @MockitoBean
    private StorageService storageService;

    @AfterEach
    void cleanUp() {
        contactMessageRepository.deleteAll();
    }

    @Test
    void publicContactSubmissionReturnsCreatedAndPersistsMessage() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullName", "Nguyễn Nhật Thiên",
                "email", "thien@edualto.vn",
                "message", "Tôi muốn hỏi về lộ trình khóa học Spring Boot."
        ));

        String responseBody = mockMvc.perform(post("/api/v1/contact")
                        .with(request -> {
                            request.setRemoteAddr("10.10.0.1");
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.status").value("NEW"))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(responseBody);
        UUID id = UUID.fromString(json.get("data").get("id").asText());
        assertThat(contactMessageRepository.findById(id)).isPresent().get().satisfies(saved -> {
            assertThat(saved.getFullName()).isEqualTo("Nguyễn Nhật Thiên");
            assertThat(saved.getEmail()).isEqualTo("thien@edualto.vn");
            assertThat(saved.getMessage()).isEqualTo("Tôi muốn hỏi về lộ trình khóa học Spring Boot.");
        });
    }

    @Test
    void invalidContactSubmissionReturnsValidationError() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullName", "",
                "email", "not-an-email",
                "message", "ngắn"
        ));

        mockMvc.perform(post("/api/v1/contact")
                        .with(request -> {
                            request.setRemoteAddr("10.10.0.2");
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details").isArray());

        assertThat(contactMessageRepository.count()).isZero();
    }

    @Test
    void excessiveContactSubmissionsFromSameIpAreRateLimited() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullName", "Học viên thử nghiệm",
                "email", "student@edualto.vn",
                "message", "Nội dung liên hệ hợp lệ đủ mười ký tự."
        ));

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/contact")
                            .with(request -> {
                                request.setRemoteAddr("10.10.0.3");
                                return request;
                            })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        }

        mockMvc.perform(post("/api/v1/contact")
                        .with(request -> {
                            request.setRemoteAddr("10.10.0.3");
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("CONTACT_RATE_LIMIT_EXCEEDED"));
    }
}
