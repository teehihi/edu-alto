package com.edualto.common.security;

import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
public class WebSocketTicketService {

    public static final long TICKET_TTL_SECONDS = 30L;
    private static final Duration TICKET_TTL = Duration.ofSeconds(TICKET_TTL_SECONDS);
    private static final String KEY_PREFIX = "ws:ticket:";
    private static final int MAX_FALLBACK_ENTRIES = 10_000;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Logger log = LoggerFactory.getLogger(WebSocketTicketService.class);

    private final ObjectProvider<StringRedisTemplate> redisTemplateProvider;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, TicketEntry> fallbackTickets = new ConcurrentHashMap<>();

    public WebSocketTicketService(
            ObjectProvider<StringRedisTemplate> redisTemplateProvider,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.redisTemplateProvider = redisTemplateProvider;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public String issueTicket(AuthenticatedUser user) {
        String ticket = generateTicket();
        List<String> authorities = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        TicketPayload payload = new TicketPayload(user.id(), user.email(), authorities);
        String serialized = serializePayload(payload);

        StringRedisTemplate redisTemplate = redisTemplateProvider.getIfAvailable();
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(KEY_PREFIX + ticket, serialized, TICKET_TTL);
                return ticket;
            } catch (RuntimeException exception) {
                log.warn("Không thể lưu WebSocket ticket trên Redis, chuyển sang bộ nhớ cục bộ: {}", exception.getMessage());
            }
        }

        storeInFallback(ticket, payload);
        return ticket;
    }

    public Optional<AuthenticatedUser> consumeTicket(String ticket) {
        if (ticket == null || ticket.isBlank()) {
            return Optional.empty();
        }

        TicketPayload payload = null;
        StringRedisTemplate redisTemplate = redisTemplateProvider.getIfAvailable();
        if (redisTemplate != null) {
            try {
                String raw = redisTemplate.opsForValue().getAndDelete(KEY_PREFIX + ticket);
                if (raw != null && !raw.isBlank()) {
                    payload = deserializePayload(raw);
                }
            } catch (RuntimeException exception) {
                log.warn("Không thể đọc WebSocket ticket từ Redis, kiểm tra bộ nhớ cục bộ: {}", exception.getMessage());
            }
        }

        Instant now = Instant.now();
        if (payload == null) {
            TicketEntry fallbackEntry = fallbackTickets.remove(ticket);
            if (fallbackEntry != null && !fallbackEntry.expiresAt().isBefore(now)) {
                payload = fallbackEntry.payload();
            }
        }
        purgeExpiredFallbackEntries(now);

        if (payload == null || payload.userId() == null) {
            return Optional.empty();
        }

        Optional<User> userOpt = userRepository.findById(payload.userId());
        if (userOpt.isEmpty() || userOpt.get().getStatus() != UserStatus.ACTIVE) {
            return Optional.empty();
        }

        User user = userOpt.get();
        List<SimpleGrantedAuthority> authorities = user.getRoles().isEmpty()
                ? payload.authorities().stream().map(SimpleGrantedAuthority::new).toList()
                : user.getRoles().stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName().name()))
                        .toList();

        return Optional.of(new AuthenticatedUser(user.getId(), user.getEmail(), authorities));
    }

    private void storeInFallback(String ticket, TicketPayload payload) {
        Instant now = Instant.now();
        purgeExpiredFallbackEntries(now);
        if (fallbackTickets.size() >= MAX_FALLBACK_ENTRIES) {
            String oldestKey = fallbackTickets.keys().nextElement();
            if (oldestKey != null) {
                fallbackTickets.remove(oldestKey);
            }
        }
        fallbackTickets.put(ticket, new TicketEntry(payload, now.plus(TICKET_TTL)));
    }

    private void purgeExpiredFallbackEntries(Instant now) {
        fallbackTickets.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    private String generateTicket() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return URL_ENCODER.encodeToString(bytes);
    }

    private String serializePayload(TicketPayload payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (RuntimeException exception) {
            throw new IllegalStateException("Unable to serialize WebSocket ticket payload", exception);
        }
    }

    private TicketPayload deserializePayload(String raw) {
        try {
            return objectMapper.readValue(raw, TicketPayload.class);
        } catch (RuntimeException exception) {
            log.warn("Dữ liệu WebSocket ticket không hợp lệ: {}", exception.getMessage());
            return null;
        }
    }

    private record TicketPayload(UUID userId, String email, List<String> authorities) {
    }

    private record TicketEntry(TicketPayload payload, Instant expiresAt) {
    }
}
