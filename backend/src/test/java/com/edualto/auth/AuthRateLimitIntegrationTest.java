package com.edualto.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.edualto.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@TestPropertySource(properties = "edualto.auth.rate-limit.max-requests=2")
class AuthRateLimitIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void securityChainLimitsAuthRequestsAndKeepsLogoutAvailable() throws Exception {
        for (String path : new String[]{"login", "register"}) {
            mockMvc.perform(post("/api/v1/auth/" + path)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(post("/api/v1/auth/login")
                .header("X-Forwarded-For", "203.0.113.9")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.error.code").value("AUTH_RATE_LIMIT_EXCEEDED"));
        mockMvc.perform(post("/api/v1/auth/logout")).andExpect(status().isOk());
    }
}
