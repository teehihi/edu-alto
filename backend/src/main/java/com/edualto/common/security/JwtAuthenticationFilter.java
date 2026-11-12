package com.edualto.common.security;

import com.edualto.auth.service.JwtTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;
    private final WebSocketTicketService webSocketTicketService;

    public JwtAuthenticationFilter(
            JwtTokenService jwtTokenService,
            WebSocketTicketService webSocketTicketService
    ) {
        this.jwtTokenService = jwtTokenService;
        this.webSocketTicketService = webSocketTicketService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        Optional<AuthenticatedUser> authenticatedUser = Optional.empty();
        String authorization = request.getHeader("Authorization");

        boolean webSocketRequest = isWebSocketHandshakeRequest(request);
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);
            authenticatedUser = jwtTokenService.parseAccessToken(token);
        } else if (webSocketRequest && StringUtils.hasText(request.getParameter("ticket"))) {
            authenticatedUser = webSocketTicketService.consumeTicket(request.getParameter("ticket"));
        }

        authenticatedUser.ifPresent(principal -> {
            UsernamePasswordAuthenticationToken authentication = webSocketRequest
                    ? new WebSocketUserAuthentication(principal)
                    : new UsernamePasswordAuthenticationToken(
                            principal,
                            null,
                            principal.getAuthorities()
                    );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        });

        filterChain.doFilter(request, response);
    }

    private boolean isWebSocketHandshakeRequest(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return "/ws".equals(uri) || uri.startsWith("/ws/");
    }
}
