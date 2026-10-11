package com.edualto.course.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonAttachment;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.Section;
import com.edualto.course.dto.LessonAttachmentResponse;
import com.edualto.course.dto.LessonResourceDownloadResponse;
import com.edualto.course.dto.LessonResourceUploadCompleteRequest;
import com.edualto.course.dto.LessonResourceUploadUrlRequest;
import com.edualto.course.dto.LessonResourceUploadUrlResponse;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.dto.PresignedDownloadUrl;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.service.StorageCleanupService;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class LessonResourceService {
    private static final long MAX_RESOURCE_SIZE_BYTES = 50L * 1024 * 1024;
    private static final Duration UPLOAD_URL_TTL = Duration.ofMinutes(15);
    private static final Duration DOWNLOAD_URL_TTL = Duration.ofMinutes(10);
    private static final String RESOURCE_KEY_PREFIX = "lesson-resources/";
    private static final Map<String, String> RESOURCE_TYPES = Map.of(
            "pdf", "application/pdf",
            "doc", "application/msword",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "txt", "text/plain",
            "ppt", "application/vnd.ms-powerpoint",
            "pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "xls", "application/vnd.ms-excel",
            "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final CourseRepository courses;
    private final SectionRepository sections;
    private final LessonRepository lessons;
    private final UserRepository users;
    private final EnrollmentService enrollments;
    private final StorageService storage;
    private final StorageCleanupService storageCleanup;
    private final TransactionTemplate readOnlyTransaction;

    public LessonResourceService(CourseRepository courses, SectionRepository sections, LessonRepository lessons,
            UserRepository users, EnrollmentService enrollments, StorageService storage,
            StorageCleanupService storageCleanup, PlatformTransactionManager transactionManager) {
        this.courses = courses;
        this.sections = sections;
        this.lessons = lessons;
        this.users = users;
        this.enrollments = enrollments;
        this.storage = storage;
        this.storageCleanup = storageCleanup;
        this.readOnlyTransaction = new TransactionTemplate(transactionManager);
        this.readOnlyTransaction.setReadOnly(true);
    }

    @Transactional(readOnly = true)
    public LessonResourceUploadUrlResponse createUploadUrl(UUID instructorId, UUID courseId, UUID sectionId,
            UUID lessonId, LessonResourceUploadUrlRequest request) {
        requireInstructorLesson(instructorId, courseId, sectionId, lessonId);
        String extension = validateResource(request.fileName(), request.contentType(), request.contentLength());
        String objectKey = RESOURCE_KEY_PREFIX + courseId + "/" + lessonId + "/" + UUID.randomUUID()
                + "." + extension;
        PresignedUploadUrl signed = storage.generatePresignedUploadUrl(objectKey, request.contentType(),
                request.contentLength(), UPLOAD_URL_TTL, "private, no-store");
        return new LessonResourceUploadUrlResponse(signed.uploadUrl(), signed.objectKey(), signed.expiresAt());
    }

    public void uploadThroughBackend(UUID instructorId, UUID courseId, UUID sectionId, UUID lessonId,
            String objectKey, String fileName, String contentType, long contentLength, InputStream inputStream) {
        String extension = extensionFor(contentType);
        String prefix = RESOURCE_KEY_PREFIX + courseId + "/" + lessonId + "/";
        String suffix = objectKey != null && objectKey.startsWith(prefix) ? objectKey.substring(prefix.length()) : "";
        readOnlyTransaction.executeWithoutResult(transactionStatus -> {
            requireInstructorLesson(instructorId, courseId, sectionId, lessonId);
            validateResource(fileName, contentType, contentLength);
            if (extension == null || suffix.isBlank() || suffix.contains("/") || !suffix.endsWith("." + extension)) {
                throw invalidResource();
            }
        });
        storage.putObject(objectKey, contentType, inputStream, contentLength);
    }

    @Transactional
    public LessonAttachmentResponse completeUpload(UUID instructorId, UUID courseId, UUID sectionId,
            UUID lessonId, LessonResourceUploadCompleteRequest request) {
        Lesson lesson = requireInstructorLesson(instructorId, courseId, sectionId, lessonId);
        ObjectMetadata metadata = storage.getObjectMetadata(request.objectKey());
        String extension = metadata == null ? null : extensionFor(metadata.contentType());
        validateResource(request.fileName(), metadata == null ? "" : metadata.contentType(),
                metadata == null ? 0 : metadata.contentLength());
        String prefix = RESOURCE_KEY_PREFIX + courseId + "/" + lessonId + "/";
        String suffix = request.objectKey().startsWith(prefix) ? request.objectKey().substring(prefix.length()) : "";
        if (metadata == null || extension == null || suffix.isBlank() || suffix.contains("/")
                || !suffix.endsWith("." + extension)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "RESOURCE_UPLOAD_NOT_FOUND",
                    "Không tìm thấy tài liệu hợp lệ trên kho lưu trữ");
        }
        LessonAttachment attachment = new LessonAttachment(UUID.randomUUID(), request.objectKey(),
                sanitizeFileName(request.fileName()), metadata.contentType(), metadata.contentLength());
        lesson.addAttachment(attachment);
        lessons.save(lesson);
        return toResponse(attachment);
    }

    @Transactional
    public void deleteAttachment(UUID instructorId, UUID courseId, UUID sectionId, UUID lessonId,
            UUID attachmentId) {
        Lesson lesson = requireInstructorLesson(instructorId, courseId, sectionId, lessonId);
        LessonAttachment attachment = lesson.removeAttachment(attachmentId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_ATTACHMENT_NOT_FOUND",
                        "Không tìm thấy tài liệu bài học"));
        lessons.save(lesson);
        storageCleanup.deleteAfterCommit(List.of(attachment.getObjectKey()));
    }

    @Transactional(readOnly = true)
    public LessonResourceDownloadResponse createDownloadUrl(UUID studentId, UUID lessonId, UUID attachmentId) {
        Lesson lesson = lessons.findById(lessonId)
                .filter(item -> item.getStatus() == LessonStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học"));
        Section section = sections.findById(lesson.getSectionId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học"));
        Course course = courses.findById(section.getCourseId())
                .filter(item -> item.getStatus() == CourseStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        enrollments.requireEnrollment(studentId, course.getId());
        LessonAttachment attachment = lesson.getAttachments().stream()
                .filter(item -> item.getId().equals(attachmentId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_ATTACHMENT_NOT_FOUND",
                        "Không tìm thấy tài liệu bài học"));
        PresignedDownloadUrl signed = storage.generatePresignedDownloadUrl(
                attachment.getObjectKey(), DOWNLOAD_URL_TTL, attachment.getFileName());
        return new LessonResourceDownloadResponse(attachmentId, signed.downloadUrl(), signed.expiresAt());
    }

    private Lesson requireInstructorLesson(UUID instructorId, UUID courseId, UUID sectionId, UUID lessonId) {
        User instructor = users.findById(instructorId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));
        boolean eligible = instructor.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.INSTRUCTOR || role.getName() == RoleName.ADMIN);
        if (instructor.getStatus() != UserStatus.ACTIVE || !eligible) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền giảng viên để thực hiện thao tác này");
        }
        Course course = courses.findById(courseId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        if (!course.getInstructorId().equals(instructorId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "UNAUTHORIZED_COURSE_ACCESS", "Bạn không có quyền thao tác trên khóa học này");
        }
        Section section = sections.findById(sectionId)
                .filter(item -> item.getCourseId().equals(courseId))
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "SECTION_NOT_FOUND", "Không tìm thấy chương học"));
        return lessons.findByIdAndSectionId(lessonId, section.getId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học"));
    }

    private String validateResource(String fileName, String contentType, long contentLength) {
        String extension = extensionFromName(fileName);
        if (contentLength < 1 || contentLength > MAX_RESOURCE_SIZE_BYTES || extension == null
                || !RESOURCE_TYPES.get(extension).equals(contentType) || sanitizeFileName(fileName).length() > 255) {
            throw invalidResource();
        }
        return extension;
    }

    private String extensionFromName(String fileName) {
        if (fileName == null) return null;
        String safeName = sanitizeFileName(fileName);
        int dot = safeName.lastIndexOf('.');
        if (dot < 1 || dot == safeName.length() - 1) return null;
        String extension = safeName.substring(dot + 1).toLowerCase(Locale.ROOT);
        return RESOURCE_TYPES.containsKey(extension) ? extension : null;
    }

    private String extensionFor(String contentType) {
        return RESOURCE_TYPES.entrySet().stream()
                .filter(entry -> entry.getValue().equals(contentType))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "";
        String normalized = fileName.replace('\\', '/');
        String safeName = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
        return safeName.replaceAll("[\\p{Cntrl}]", "");
    }

    private BusinessException invalidResource() {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_LESSON_RESOURCE",
                "Chỉ hỗ trợ PDF, Word, PowerPoint, Excel hoặc tệp văn bản tối đa 50 MB");
    }

    private LessonAttachmentResponse toResponse(LessonAttachment attachment) {
        return new LessonAttachmentResponse(attachment.getId(), attachment.getFileName(),
                attachment.getContentType(), attachment.getContentLength());
    }
}
