package com.edualto.notification.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.notification.domain.NotificationAudience;
import com.edualto.notification.domain.NotificationStatus;
import com.edualto.notification.dto.InstructorNotificationRequest;
import com.edualto.notification.dto.InstructorNotificationResponse;
import com.edualto.notification.dto.LearnerInstructorAnnouncementResponse;
import com.edualto.notification.repository.InstructorNotificationRepository;
import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.service.StorageService;
import com.edualto.user.service.UserService;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InstructorNotificationService {
    private static final int MAX_PAGE_SIZE = 100;

    private final InstructorNotificationRepository notifications;
    private final UserService users;
    private final StorageService storage;

    public InstructorNotificationService(InstructorNotificationRepository notifications, UserService users,
            StorageService storage) {
        this.notifications = notifications;
        this.users = users;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public Page<InstructorNotificationResponse> list(UUID instructorId, int page, int size,
            NotificationStatus status, NotificationAudience audience) {
        users.requireActiveInstructor(instructorId);
        validatePagination(page, size);
        long total = notifications.count(instructorId, status, audience);
        List<InstructorNotificationResponse> result = notifications.list(instructorId, status, audience,
                size, (long) page * size).stream().map(this::resolveImageUrl).toList();
        return new PageImpl<>(result, PageRequest.of(page, size), total);
    }

    @Transactional(readOnly = true)
    public Page<LearnerInstructorAnnouncementResponse> listActiveAnnouncements(UUID studentId, int page, int size) {
        users.requireActiveStudent(studentId);
        validatePagination(page, size);
        long total = notifications.countActiveAnnouncements(studentId);
        List<LearnerInstructorAnnouncementResponse> result = notifications
                .listActiveAnnouncements(studentId, size, (long) page * size)
                .stream()
                .map(announcement -> new LearnerInstructorAnnouncementResponse(announcement.id(),
                        announcement.instructorName(), announcement.title(), announcement.description(),
                        announcement.linkUrl(), announcement.imageKey() == null ? null
                                : storage.getPublicUrl(announcement.imageKey()), announcement.publishedAt()))
                .toList();
        return new PageImpl<>(result, PageRequest.of(page, size), total);
    }

    @Transactional(readOnly = true)
    public InstructorNotificationResponse get(UUID instructorId, UUID notificationId) {
        users.requireActiveInstructor(instructorId);
        return requireNotification(instructorId, notificationId);
    }

    @Transactional
    public InstructorNotificationResponse create(UUID instructorId, InstructorNotificationRequest request) {
        users.requireActiveInstructor(instructorId);
        validate(request, instructorId);
        UUID id = notifications.insert(instructorId, request);
        return requireNotification(instructorId, id);
    }

    @Transactional
    public InstructorNotificationResponse update(UUID instructorId, UUID notificationId,
            InstructorNotificationRequest request) {
        users.requireActiveInstructor(instructorId);
        validate(request, instructorId);
        InstructorNotificationResponse current = requireNotification(instructorId, notificationId);
        if (current.status() != NotificationStatus.DRAFT) {
            throw conflict("NOTIFICATION_ALREADY_PUBLISHED", "Thông báo đã xuất bản không thể chỉnh sửa");
        }
        if (!notifications.update(instructorId, notificationId, request)) {
            throw notFound();
        }
        return requireNotification(instructorId, notificationId);
    }

    @Transactional
    public InstructorNotificationResponse publish(UUID instructorId, UUID notificationId) {
        users.requireActiveInstructor(instructorId);
        InstructorNotificationResponse current = requireNotification(instructorId, notificationId);
        if (current.status() == NotificationStatus.PUBLISHED) {
            return current;
        }
        notifications.publish(instructorId, notificationId);
        return requireNotification(instructorId, notificationId);
    }

    @Transactional
    public void delete(UUID instructorId, UUID notificationId) {
        users.requireActiveInstructor(instructorId);
        requireNotification(instructorId, notificationId);
        notifications.softDelete(instructorId, notificationId);
    }

    private void validate(InstructorNotificationRequest request, UUID instructorId) {
        Instant startsAt = request.startsAt();
        Instant endsAt = request.endsAt();
        if (startsAt != null && endsAt != null && !startsAt.isBefore(endsAt)) {
            throw badRequest("INVALID_NOTIFICATION_PERIOD", "Thời gian kết thúc phải sau thời gian bắt đầu");
        }
        validateLink(request.linkUrl());
        validateImageKey(instructorId, request.imageKey());
    }

    private void validateLink(String linkUrl) {
        if (linkUrl == null || linkUrl.isBlank()) {
            return;
        }
        try {
            URI uri = URI.create(linkUrl.trim());
            String scheme = uri.getScheme();
            if (uri.isAbsolute() && !"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
                throw badRequest("INVALID_NOTIFICATION_LINK", "Đường dẫn chỉ hỗ trợ HTTP hoặc HTTPS");
            }
            if (!uri.isAbsolute() && (!linkUrl.trim().startsWith("/") || linkUrl.trim().startsWith("//"))) {
                throw badRequest("INVALID_NOTIFICATION_LINK", "Đường dẫn phải bắt đầu bằng / hoặc dùng HTTP, HTTPS");
            }
        } catch (IllegalArgumentException exception) {
            throw badRequest("INVALID_NOTIFICATION_LINK", "Đường dẫn thông báo không hợp lệ");
        }
    }

    private void validateImageKey(UUID instructorId, String imageKey) {
        if (imageKey == null || imageKey.isBlank()) {
            return;
        }
        String key = imageKey.trim();
        String prefix = "courses/thumbnails/" + instructorId + "/";
        if (!key.startsWith(prefix) || key.substring(prefix.length()).isBlank()
                || key.substring(prefix.length()).contains("/")) {
            throw badRequest("INVALID_NOTIFICATION_IMAGE", "Ảnh thông báo phải thuộc kho ảnh khóa học của bạn");
        }
        if (!storage.objectExists(key)) {
            throw badRequest("NOTIFICATION_IMAGE_NOT_FOUND", "Không tìm thấy ảnh thông báo đã tải lên");
        }
        ObjectMetadata metadata = storage.getObjectMetadata(key);
        if (metadata == null || !List.of("image/jpeg", "image/png", "image/webp").contains(metadata.contentType())) {
            throw badRequest("INVALID_NOTIFICATION_IMAGE", "Ảnh thông báo phải có định dạng JPEG, PNG hoặc WebP");
        }
    }

    private InstructorNotificationResponse requireNotification(UUID instructorId, UUID notificationId) {
        return notifications.find(instructorId, notificationId)
                .map(this::resolveImageUrl)
                .orElseThrow(this::notFound);
    }

    private InstructorNotificationResponse resolveImageUrl(InstructorNotificationResponse notification) {
        String imageUrl = notification.imageKey() == null ? null : storage.getPublicUrl(notification.imageKey());
        return new InstructorNotificationResponse(notification.id(), notification.title(), notification.description(),
                notification.linkUrl(), notification.audience(), notification.imageKey(), imageUrl,
                notification.status(), notification.startsAt(), notification.endsAt(), notification.publishedAt(),
                notification.createdAt(), notification.updatedAt());
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw badRequest("INVALID_PAGINATION", "Trang phải từ 0 và kích thước trang từ 1 đến 100");
        }
    }

    private BusinessException notFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "NOTIFICATION_NOT_FOUND", "Không tìm thấy thông báo");
    }

    private BusinessException badRequest(String code, String message) {
        return new BusinessException(HttpStatus.BAD_REQUEST, code, message);
    }

    private BusinessException conflict(String code, String message) {
        return new BusinessException(HttpStatus.CONFLICT, code, message);
    }
}
