package com.edualto.auth.infrastructure;

import com.edualto.auth.service.AuthRateLimitService;
import com.edualto.common.exception.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final Set<String> LIMITED_PATHS = Set.of(
            "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/forgot-password",
            "/api/v1/auth/resend-verification", "/api/v1/auth/verify-email",
            "/api/v1/auth/verify-reset-otp", "/api/v1/auth/reset-password");

    private final AuthRateLimitService limits;
    private final ObjectMapper objectMapper;

    public AuthRateLimitFilter(AuthRateLimitService limits, ObjectMapper objectMapper) {
        this.limits = limits;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !"POST".equals(request.getMethod()) || !LIMITED_PATHS.contains(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long retryAfter = limits.retryAfterSeconds(request.getRemoteAddr());
        if (retryAfter == 0) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader(HttpHeaders.RETRY_AFTER, Long.toString(retryAfter));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), ErrorResponse.of("AUTH_RATE_LIMIT_EXCEEDED",
                "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một phút rồi thử lại.", List.of(), request.getRequestURI()));
    }
}
