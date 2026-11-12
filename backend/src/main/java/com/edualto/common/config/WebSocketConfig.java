package com.edualto.common.config;

import com.edualto.auth.service.JwtTokenService;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.common.security.SecurityConfig;
import com.edualto.common.security.WebSocketUserAuthentication;
import com.edualto.messaging.repository.MessagingRepository;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.security.Principal;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final String CONVERSATION_TOPIC_PREFIX = "/topic/conversations/";
    private static final String CONVERSATION_APP_PREFIX = "/app/conversations/";
    private static final Set<String> ALLOWED_USER_QUEUES = Set.of(
            "/user/queue/notifications",
            "/user/queue/messages",
            "/user/queue/presence"
    );

    private final JwtTokenService jwtTokenService;
    private final MessagingRepository messagingRepository;
    private final UserRepository userRepository;
    private final Environment environment;
    private final String allowedOrigins;
    private final boolean allowLocalNetworkOrigins;

    public WebSocketConfig(
            JwtTokenService jwtTokenService,
            MessagingRepository messagingRepository,
            UserRepository userRepository,
            Environment environment,
            @Value("${edualto.cors.allowed-origins:http://localhost:3000}") String allowedOrigins,
            @Value("${edualto.cors.allow-local-network-origins:false}") boolean allowLocalNetworkOrigins
    ) {
        this.jwtTokenService = jwtTokenService;
        this.messagingRepository = messagingRepository;
        this.userRepository = userRepository;
        this.environment = environment;
        this.allowedOrigins = allowedOrigins;
        this.allowLocalNetworkOrigins = allowLocalNetworkOrigins;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] originPatterns = SecurityConfig.resolveAllowedOriginPatterns(
                environment,
                allowedOrigins,
                allowLocalNetworkOrigins
        ).toArray(String[]::new);
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(originPatterns);
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(originPatterns)
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthorizationInterceptor());
    }

    @Bean
    public ChannelInterceptor stompAuthorizationInterceptor() {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) {
                    return message;
                }

                StompCommand command = accessor.getCommand();
                if (StompCommand.CONNECT.equals(command)) {
                    authenticateConnectFrame(accessor);
                } else if (StompCommand.SUBSCRIBE.equals(command)) {
                    authorizeSubscribeFrame(accessor);
                } else if (StompCommand.SEND.equals(command)) {
                    authorizeSendFrame(accessor);
                }
                return message;
            }
        };
    }

    private void authenticateConnectFrame(StompHeaderAccessor accessor) {
        Optional<AuthenticatedUser> existingUser = extractAuthenticatedUser(accessor);
        if (existingUser.isPresent()) {
            accessor.setUser(new WebSocketUserAuthentication(existingUser.get()));
            return;
        }

        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if (!token.isEmpty()) {
                jwtTokenService.parseAccessToken(token)
                        .filter(principal -> isUserActive(principal.id()))
                        .ifPresent(principal -> accessor.setUser(new WebSocketUserAuthentication(principal)));
            }
        }

        if (extractAuthenticatedUser(accessor).isEmpty()) {
            throw new AccessDeniedException("UNAUTHORIZED");
        }
    }

    private void authorizeSubscribeFrame(StompHeaderAccessor accessor) {
        AuthenticatedUser user = requireAuthenticatedUser(accessor);
        String destination = accessor.getDestination();
        if (destination == null || destination.isBlank()) {
            throw new AccessDeniedException("FORBIDDEN");
        }

        if (ALLOWED_USER_QUEUES.contains(destination)) {
            return;
        }

        if (destination.startsWith(CONVERSATION_TOPIC_PREFIX)) {
            String rawConversationId = destination.substring(CONVERSATION_TOPIC_PREFIX.length());
            if (rawConversationId.isEmpty() || rawConversationId.contains("/")) {
                throw new AccessDeniedException("FORBIDDEN");
            }
            UUID conversationId = parseUuidOrThrow(rawConversationId);
            if (!messagingRepository.isParticipant(conversationId, user.id())) {
                throw new AccessDeniedException("FORBIDDEN");
            }
            return;
        }

        throw new AccessDeniedException("FORBIDDEN");
    }

    private void authorizeSendFrame(StompHeaderAccessor accessor) {
        AuthenticatedUser user = requireAuthenticatedUser(accessor);
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith("/app/")) {
            throw new AccessDeniedException("FORBIDDEN");
        }

        if (destination.startsWith(CONVERSATION_APP_PREFIX)) {
            String remainder = destination.substring(CONVERSATION_APP_PREFIX.length());
            int slashIndex = remainder.indexOf('/');
            String rawConversationId = slashIndex >= 0 ? remainder.substring(0, slashIndex) : remainder;
            if (rawConversationId.isEmpty()) {
                throw new AccessDeniedException("FORBIDDEN");
            }
            UUID conversationId = parseUuidOrThrow(rawConversationId);
            if (!messagingRepository.isParticipant(conversationId, user.id())) {
                throw new AccessDeniedException("FORBIDDEN");
            }
        }
    }

    private AuthenticatedUser requireAuthenticatedUser(StompHeaderAccessor accessor) {
        return extractAuthenticatedUser(accessor)
                .orElseThrow(() -> new AccessDeniedException("UNAUTHORIZED"));
    }

    private Optional<AuthenticatedUser> extractAuthenticatedUser(StompHeaderAccessor accessor) {
        Principal user = accessor.getUser();
        if (user instanceof Authentication authentication
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser) {
            return Optional.of(authenticatedUser);
        }
        if (user instanceof AuthenticatedUser authenticatedUser) {
            return Optional.of(authenticatedUser);
        }
        return Optional.empty();
    }

    private boolean isUserActive(UUID userId) {
        if (userId == null) {
            return false;
        }
        return userRepository.findById(userId)
                .map(user -> user.getStatus() == UserStatus.ACTIVE)
                .orElse(false);
    }

    private UUID parseUuidOrThrow(String rawId) {
        try {
            return UUID.fromString(rawId);
        } catch (IllegalArgumentException exception) {
            throw new AccessDeniedException("FORBIDDEN");
        }
    }
}
