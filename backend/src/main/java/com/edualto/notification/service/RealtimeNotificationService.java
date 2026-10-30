package com.edualto.notification.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.notification.domain.Notification;
import com.edualto.notification.domain.NotificationType;
import com.edualto.notification.dto.NotificationResponse;
import com.edualto.notification.dto.NotificationSummaryResponse;
import com.edualto.notification.repository.NotificationRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RealtimeNotificationService {

    private final NotificationRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeNotificationService(NotificationRepository repository, SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public NotificationResponse sendNotification(
            UUID recipientId,
            NotificationType type,
            String title,
            String message,
            String linkUrl
    ) {
        Notification notification = new Notification(
                UUID.randomUUID(),
                recipientId,
                type,
                title,
                message,
                linkUrl
        );
        Notification saved = repository.save(notification);
        NotificationResponse response = toResponse(saved);

        // Push real-time via WebSocket
        try {
            messagingTemplate.convertAndSendToUser(recipientId.toString(), "/queue/notifications", response);
            messagingTemplate.convertAndSend("/topic/notifications/" + recipientId, response);
        } catch (Exception ignored) {
            // Safe fallback if client is currently offline
        }

        return response;
    }

    @Transactional(readOnly = true)
    public NotificationSummaryResponse getMyNotifications(UUID recipientId, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang không hợp lệ");
        }
        Page<Notification> pageResult = repository.findAllByRecipientIdOrderByCreatedAtDesc(
                recipientId,
                PageRequest.of(page, size)
        );
        List<NotificationResponse> items = pageResult.getContent().stream()
                .map(this::toResponse)
                .toList();
        long unreadCount = repository.countByRecipientIdAndReadAtIsNull(recipientId);

        return new NotificationSummaryResponse(items, unreadCount, pageResult.getTotalElements());
    }

    @Transactional
    public NotificationResponse markAsRead(UUID recipientId, UUID notificationId) {
        Notification notification = repository.findByIdAndRecipientId(notificationId, recipientId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Không tìm thấy thông báo"));
        notification.markRead();
        Notification saved = repository.save(notification);
        return toResponse(saved);
    }

    @Transactional
    public int markAllAsRead(UUID recipientId) {
        return repository.markAllAsRead(recipientId);
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getRecipientId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getLinkUrl(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
