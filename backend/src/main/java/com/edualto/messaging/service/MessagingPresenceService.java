package com.edualto.messaging.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.messaging.repository.MessagingRepository;
import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Service
public class MessagingPresenceService {

    private static final int MAX_TRACKED_USERS = 50_000;
    private static final int MAX_PARTNERS_TO_NOTIFY = 100;
    private static final int MAX_QUERY_USER_IDS = 50;
    private static final Logger log = LoggerFactory.getLogger(MessagingPresenceService.class);

    private final ConcurrentHashMap<UUID, AtomicInteger> activeSessions = new ConcurrentHashMap<>();
    private final MessagingRepository messagingRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public MessagingPresenceService(
            MessagingRepository messagingRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.messagingRepository = messagingRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        extractUserId(event.getUser()).ifPresent(this::markConnected);
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        extractUserId(event.getUser()).ifPresent(this::markDisconnected);
    }

    public boolean isOnline(UUID userId) {
        if (userId == null) {
            return false;
        }
        AtomicInteger count = activeSessions.get(userId);
        return count != null && count.get() > 0;
    }

    public List<PresenceStatusResponse> getPresenceStatuses(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        List<UUID> distinctIds = userIds.stream().distinct().toList();
        if (distinctIds.size() > MAX_QUERY_USER_IDS) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_PRESENCE_QUERY",
                    "Chỉ có thể kiểm tra trạng thái tối đa 50 người dùng mỗi lần"
            );
        }
        return distinctIds.stream()
                .map(id -> new PresenceStatusResponse(id, isOnline(id)))
                .toList();
    }

    void markConnected(UUID userId) {
        if (activeSessions.size() >= MAX_TRACKED_USERS && !activeSessions.containsKey(userId)) {
            return;
        }
        AtomicBoolean becameOnline = new AtomicBoolean(false);
        activeSessions.compute(userId, (ignored, count) -> {
            if (count == null) {
                becameOnline.set(true);
                return new AtomicInteger(1);
            }
            if (count.incrementAndGet() == 1) {
                becameOnline.set(true);
            }
            return count;
        });
        if (becameOnline.get()) {
            notifyOnlinePartners(userId, true);
        }
    }

    void markDisconnected(UUID userId) {
        AtomicBoolean becameOffline = new AtomicBoolean(false);
        activeSessions.computeIfPresent(userId, (ignored, count) -> {
            int remaining = count.decrementAndGet();
            if (remaining <= 0) {
                becameOffline.set(true);
                return null;
            }
            return count;
        });
        if (becameOffline.get()) {
            notifyOnlinePartners(userId, false);
        }
    }

    private void notifyOnlinePartners(UUID userId, boolean online) {
        try {
            List<UUID> partnerIds = messagingRepository.findConversationPartnerIds(userId, MAX_PARTNERS_TO_NOTIFY);
            if (partnerIds.isEmpty()) {
                return;
            }
            PresenceEvent event = new PresenceEvent("PRESENCE_UPDATED", userId, online, Instant.now());
            for (UUID partnerId : partnerIds) {
                if (isOnline(partnerId)) {
                    try {
                        messagingTemplate.convertAndSendToUser(partnerId.toString(), "/queue/presence", event);
                    } catch (RuntimeException exception) {
                        log.warn("Không thể gửi trạng thái presence tới user [{}]: {}", partnerId, exception.getMessage());
                    }
                }
            }
        } catch (RuntimeException exception) {
            log.warn("Không thể cập nhật trạng thái presence cho user [{}]: {}", userId, exception.getMessage());
        }
    }

    private Optional<UUID> extractUserId(Principal principal) {
        if (principal == null) {
            return Optional.empty();
        }
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser) {
            return Optional.ofNullable(authenticatedUser.id());
        }
        if (principal instanceof AuthenticatedUser authenticatedUser) {
            return Optional.ofNullable(authenticatedUser.id());
        }
        try {
            return Optional.of(UUID.fromString(principal.getName()));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    public record PresenceStatusResponse(UUID userId, boolean online) {
    }

    public record PresenceEvent(String type, UUID userId, boolean online, Instant occurredAt) {
    }
}
