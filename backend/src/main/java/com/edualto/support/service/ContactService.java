package com.edualto.support.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.support.domain.ContactMessage;
import com.edualto.support.dto.ContactMessageRequest;
import com.edualto.support.dto.ContactMessageResponse;
import com.edualto.support.repository.ContactMessageRepository;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContactService {

    private final ContactMessageRepository repository;
    private final Clock clock;
    private final int maxRequests;
    private final long windowSeconds;
    private final int maxClients;
    private final Map<String, Window> clients = new HashMap<>();
    private long nextCleanupAt;

    @Autowired
    public ContactService(
            ContactMessageRepository repository,
            Clock clock,
            @Value("${edualto.support.rate-limit.max-requests:5}") int maxRequests,
            @Value("${edualto.support.rate-limit.window-seconds:600}") long windowSeconds,
            @Value("${edualto.support.rate-limit.max-clients:10000}") int maxClients
    ) {
        if (maxRequests < 1 || windowSeconds < 1 || maxClients < 1) {
            throw new IllegalArgumentException("Contact rate limits must be positive");
        }
        this.repository = repository;
        this.clock = clock;
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
        this.maxClients = maxClients;
    }

    @Transactional
    public ContactMessageResponse submit(ContactMessageRequest request, String clientIp) {
        enforceRateLimit(clientIp == null || clientIp.isBlank() ? "unknown" : clientIp.trim());

        ContactMessage entity = new ContactMessage(
                request.fullName().trim(),
                request.email().trim(),
                request.message().trim()
        );
        ContactMessage saved = repository.save(entity);
        return new ContactMessageResponse(saved.getId(), saved.getStatus(), saved.getCreatedAt());
    }

    private synchronized void enforceRateLimit(String clientIp) {
        long now = clock.instant().getEpochSecond();
        if (now >= nextCleanupAt) {
            clients.entrySet().removeIf(entry -> entry.getValue().expiresAt <= now);
            nextCleanupAt = now + windowSeconds;
        }
        Window window = clients.get(clientIp);
        if (window == null || window.expiresAt <= now) {
            if (window == null && clients.size() >= maxClients) {
                throw new BusinessException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "CONTACT_RATE_LIMIT_EXCEEDED",
                        "Bạn đã gửi quá nhiều lời nhắn. Vui lòng thử lại sau ít phút."
                );
            }
            window = new Window(now + windowSeconds);
            clients.put(clientIp, window);
        }
        if (window.requests >= maxRequests) {
            throw new BusinessException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "CONTACT_RATE_LIMIT_EXCEEDED",
                    "Bạn đã gửi quá nhiều lời nhắn. Vui lòng thử lại sau ít phút."
            );
        }
        window.requests++;
    }

    private static final class Window {
        private final long expiresAt;
        private int requests;

        private Window(long expiresAt) {
            this.expiresAt = expiresAt;
        }
    }
}
