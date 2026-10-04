package com.edualto.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import com.edualto.auth.service.AuthRateLimitService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.ObjectMapper;

class AuthRateLimitFilterTest {
    @Test
    void rejectsCredentialRequestsWithStandardJsonAndRetryAfter() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        AuthRateLimitFilter filter = new AuthRateLimitFilter(new AuthRateLimitService(
                Clock.fixed(Instant.parse("2026-10-04T00:00:00Z"), ZoneOffset.UTC), 1, 60, 100), mapper);
        MockHttpServletResponse first = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("POST", "/api/v1/auth/login"), first, new MockFilterChain());
        MockHttpServletResponse rejected = new MockHttpServletResponse();
        MockFilterChain blockedChain = new MockFilterChain();
        filter.doFilter(new MockHttpServletRequest("POST", "/api/v1/auth/register"), rejected, blockedChain);

        assertThat(rejected.getStatus()).isEqualTo(429);
        assertThat(rejected.getHeader("Retry-After")).isEqualTo("60");
        assertThat(mapper.readTree(rejected.getContentAsString()).get("error").get("code").asText())
                .isEqualTo("AUTH_RATE_LIMIT_EXCEEDED");
        assertThat(blockedChain.getRequest()).isNull();

        for (String path : new String[]{"/api/v1/auth/logout", "/api/v1/auth/refresh"}) {
            MockFilterChain permittedChain = new MockFilterChain();
            filter.doFilter(new MockHttpServletRequest("POST", path), new MockHttpServletResponse(), permittedChain);
            assertThat(permittedChain.getRequest()).isNotNull();
        }
    }
}
