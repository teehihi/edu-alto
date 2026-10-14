package com.edualto.notification.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.notification.dto.LearnerNotificationRecord;
import com.edualto.notification.dto.LearnerNotificationResponse;
import com.edualto.notification.repository.LearnerNotificationRepository;
import com.edualto.storage.service.StorageService;
import com.edualto.user.service.UserService;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearnerNotificationService {
    private static final int MAX_PAGE_SIZE = 100;

    private final LearnerNotificationRepository notifications;
    private final UserService users;
    private final StorageService storage;

    public LearnerNotificationService(LearnerNotificationRepository notifications, UserService users,
                                      StorageService storage) {
        this.notifications = notifications;
        this.users = users;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public Page<LearnerNotificationResponse> list(UUID studentId, int page, int size) {
        users.requireActiveStudent(studentId);
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION",
                    "Trang phải từ 0 và kích thước trang từ 1 đến 100");
        }
        long total = notifications.count(studentId);
        List<LearnerNotificationResponse> result = notifications.list(studentId, size, (long) page * size)
                .stream().map(this::toResponse).toList();
        return new PageImpl<>(result, PageRequest.of(page, size), total);
    }

    private LearnerNotificationResponse toResponse(LearnerNotificationRecord notification) {
        String imageUrl = notification.imageKey() == null ? null : storage.getPublicUrl(notification.imageKey());
        String instructorAvatarUrl = notification.instructorAvatarKey() == null
                ? null : storage.getPublicUrl(notification.instructorAvatarKey());
        return new LearnerNotificationResponse(notification.id(), notification.type(),
                notification.instructorName(), instructorAvatarUrl, notification.title(), notification.description(),
                notification.linkUrl(), imageUrl, notification.createdAt());
    }
}
