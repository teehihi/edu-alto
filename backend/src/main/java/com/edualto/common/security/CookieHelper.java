package com.edualto.common.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CookieHelper {

    private static final String REFRESH_TOKEN_COOKIE = "edualto.refresh";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final boolean secure;
    private final String domain;
    private final long maxAgeSeconds;

    public CookieHelper(
            @Value("${edualto.auth.cookie.secure:false}") boolean secure,
            @Value("${edualto.auth.cookie.domain:}") String domain,
            @Value("${edualto.auth.refresh-token-ttl-days}") long refreshTokenTtlDays
    ) {
        this.secure = secure;
        this.domain = domain == null || domain.isBlank() ? null : domain.trim();
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
        StringBuilder sb = new StringBuilder();
        sb.append(REFRESH_TOKEN_COOKIE).append("=").append(value);
        sb.append("; Path=").append(COOKIE_PATH);
        sb.append("; Max-Age=").append(maxAge);
        sb.append("; HttpOnly");
        sb.append("; SameSite=None");
        if (secure) {
            sb.append("; Secure");
        }
        if (domain != null) {
            sb.append("; Domain=").append(domain);
        }
        return sb.toString();
    }
}
