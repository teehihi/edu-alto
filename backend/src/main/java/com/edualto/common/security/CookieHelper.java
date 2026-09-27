package com.edualto.common.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieHelper {

    private static final String REFRESH_TOKEN_COOKIE = "edualto.refresh";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final boolean secure;
    private final String domain;
    private final String sameSite;
    private final long maxAgeSeconds;

    public CookieHelper(
            @Value("${edualto.auth.cookie.secure:false}") boolean secure,
            @Value("${edualto.auth.cookie.domain:}") String domain,
            @Value("${edualto.auth.cookie.same-site:Lax}") String sameSite,
            @Value("${edualto.auth.refresh-token-ttl-days}") long refreshTokenTtlDays
    ) {
        this.secure = secure;
        this.domain = domain == null || domain.isBlank() ? null : domain.trim();
        this.sameSite = normalizeSameSite(sameSite, secure);
        this.maxAgeSeconds = refreshTokenTtlDays * 24 * 60 * 60;
    }

    public void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        response.addHeader("Set-Cookie", buildCookieHeader(refreshToken, maxAgeSeconds));
    }

    public void clearRefreshTokenCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie", buildCookieHeader("", 0));
    }

    public static String cookieName() {
        return REFRESH_TOKEN_COOKIE;
    }

    private String buildCookieHeader(String value, long maxAge) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(REFRESH_TOKEN_COOKIE, value)
                .path(COOKIE_PATH)
                .maxAge(maxAge)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite);
        if (domain != null) {
            builder.domain(domain);
        }
        return builder.build().toString();
    }

    private static String normalizeSameSite(String sameSite, boolean secure) {
        if (sameSite == null) {
            throw new IllegalArgumentException("Auth cookie SameSite must be Lax, Strict, or None");
        }
        String normalized = sameSite.trim();
        if ("lax".equalsIgnoreCase(normalized)) {
            return "Lax";
        }
        if ("strict".equalsIgnoreCase(normalized)) {
            return "Strict";
        }
        if ("none".equalsIgnoreCase(normalized)) {
            if (!secure) {
                throw new IllegalArgumentException("Auth cookie SameSite=None requires AUTH_COOKIE_SECURE=true");
            }
            return "None";
        }
        throw new IllegalArgumentException("Auth cookie SameSite must be Lax, Strict, or None");
    }
}
