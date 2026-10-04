package com.edualto.auth.service;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthRateLimitService {
    private final Map<String, Window> clients = new HashMap<>();
    private final Clock clock;
    private final int maxRequests;
    private final long windowSeconds;
    private final int maxClients;
    private long nextCleanupAt;

    public AuthRateLimitService(Clock clock,
            @Value("${edualto.auth.rate-limit.max-requests:60}") int maxRequests,
            @Value("${edualto.auth.rate-limit.window-seconds:60}") long windowSeconds,
            @Value("${edualto.auth.rate-limit.max-clients:10000}") int maxClients) {
        if (maxRequests < 1 || windowSeconds < 1 || maxClients < 1) {
            throw new IllegalArgumentException("Auth rate limits must be positive");
        }
        this.clock = clock;
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
        this.maxClients = maxClients;
    }

    public synchronized long retryAfterSeconds(String clientIp) {
        long now = clock.instant().getEpochSecond();
        if (now >= nextCleanupAt) {
            clients.entrySet().removeIf(entry -> entry.getValue().expiresAt <= now);
            nextCleanupAt = now + windowSeconds;
        }
        Window window = clients.get(clientIp);
        if (window == null || window.expiresAt <= now) {
            if (window == null && clients.size() >= maxClients) return Math.max(1, nextCleanupAt - now);
            window = new Window(now + windowSeconds);
            clients.put(clientIp, window);
        }
        if (window.requests >= maxRequests) return Math.max(1, window.expiresAt - now);
        window.requests++;
        return 0;
    }

    private static final class Window {
        private final long expiresAt;
        private int requests;

        private Window(long expiresAt) {
            this.expiresAt = expiresAt;
        }
    }
}
