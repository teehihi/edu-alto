package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.dto.SavedLessonResourceResponse;
import com.edualto.learning.repository.SavedLessonResourceRepository;
import com.edualto.learning.repository.SavedLessonResourceRepository.PublishedLessonResourceRow;
import com.edualto.learning.repository.SavedLessonResourceRepository.SavedLessonResourceRow;
import com.edualto.user.service.UserService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedLessonResourceService {
    private final SavedLessonResourceRepository savedResources;
    private final UserService users;
    private final EnrollmentService enrollments;

    public SavedLessonResourceService(SavedLessonResourceRepository savedResources, UserService users,
                                      EnrollmentService enrollments) {
        this.savedResources = savedResources;
        this.users = users;
        this.enrollments = enrollments;
    }

    @Transactional(readOnly = true)
    public Page<SavedLessonResourceResponse> list(UUID userId, int page, int size, UUID courseId) {
        users.requireActiveStudent(userId);
        validatePage(page, size);
        return savedResources.findAllResponsesByUserId(userId, courseId, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    @Transactional
    public SavedLessonResourceResponse save(UUID userId, UUID attachmentId) {
        users.requireActiveStudent(userId);
        PublishedLessonResourceRow lessonInfo = savedResources.findPublishedLessonByAttachmentId(attachmentId)
                .orElseThrow(this::resourceNotFound);
        enrollments.requireEnrollment(userId, lessonInfo.getCourseId());
        savedResources.insertIfAbsent(UUID.randomUUID(), userId, attachmentId);
        return savedResources.findResponseByUserIdAndAttachmentId(userId, attachmentId)
                .map(this::toResponse).orElseThrow(this::resourceNotFound);
    }

    @Transactional
    public void delete(UUID userId, UUID attachmentId) {
        users.requireActiveStudent(userId);
        savedResources.deleteByUserIdAndAttachmentId(userId, attachmentId);
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION",
                    "Phân trang tài liệu đã lưu không hợp lệ");
        }
    }

    private BusinessException resourceNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "LESSON_ATTACHMENT_NOT_FOUND",
                "Không tìm thấy tài liệu bài học");
    }

    private SavedLessonResourceResponse toResponse(SavedLessonResourceRow row) {
        return new SavedLessonResourceResponse(row.getId(), row.getAttachmentId(), row.getLessonId(),
                row.getCourseId(), row.getCourseSlug(), row.getCourseTitle(), row.getSectionTitle(),
                row.getLessonTitle(), row.getFileName(), row.getContentType(), row.getContentLength(),
                row.getSavedAt());
    }
}
