package com.edualto.common.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.edualto.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

class WebSocketSecurityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void websocketHandshakeIsNotPublicWhileRealtimeAuthenticationIsUnavailable() throws Exception {
        mockMvc.perform(get("/ws").header("Connection", "Upgrade").header("Upgrade", "websocket"))
                .andExpect(status().isUnauthorized());
    }
}
