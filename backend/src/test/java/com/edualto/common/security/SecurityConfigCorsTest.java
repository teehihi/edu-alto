package com.edualto.common.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigCorsTest {

    private final SecurityConfig securityConfig = new SecurityConfig();

    @Test
    void prodProfileExcludesLanAndLocalhostWildcardPatterns() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");

        CorsConfigurationSource source = securityConfig.createCorsConfigurationSource(
                environment,
                "https://edualto.vn,https://app.edualto.vn",
                false
        );

        CorsConfiguration configuration = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/v1/health"));
        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOriginPatterns())
                .containsExactly("https://edualto.vn", "https://app.edualto.vn")
                .doesNotContain("http://192.168.*:*", "http://10.*", "http://172.*", "http://localhost:*", "http://127.0.0.1");
    }

    @Test
    void emptyActiveProfilesExcludeLanAndLocalhostWildcardPatterns() {
        MockEnvironment environment = new MockEnvironment();

        CorsConfigurationSource source = securityConfig.createCorsConfigurationSource(
                environment,
                "https://edualto.vn",
                false
        );

        CorsConfiguration configuration = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/v1/health"));
        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOriginPatterns())
                .containsExactly("https://edualto.vn")
                .doesNotContain("http://192.168.*:*", "http://10.*", "http://172.*", "http://localhost:*", "http://127.0.0.1");
    }

    @Test
    void localProfileIncludesLanAndLocalhostWildcardPatterns() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("local");

        CorsConfigurationSource source = securityConfig.createCorsConfigurationSource(
                environment,
                "https://edualto.vn",
                false
        );

        CorsConfiguration configuration = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/v1/health"));
        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOriginPatterns())
                .contains("https://edualto.vn", "http://192.168.*:*", "http://10.*", "http://172.*", "http://localhost:*", "http://127.0.0.1");
    }

    @Test
    void allowLocalNetworkOriginsFlagIncludesLanWildcardPatternsEvenInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ReflectionTestUtils.setField(securityConfig, "allowedOrigins", "https://edualto.vn");
        ReflectionTestUtils.setField(securityConfig, "allowLocalNetworkOrigins", true);

        CorsConfigurationSource source = securityConfig.corsConfigurationSource(environment);

        CorsConfiguration configuration = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/v1/health"));
        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOriginPatterns())
                .contains("https://edualto.vn", "http://192.168.*:*", "http://10.*", "http://172.*", "http://localhost:*", "http://127.0.0.1");
    }
}
