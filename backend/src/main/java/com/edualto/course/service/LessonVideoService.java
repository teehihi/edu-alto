package com.edualto.course.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.domain.Section;
import com.edualto.course.dto.LessonVideoAccessResponse;
import com.edualto.course.dto.LessonVideoUploadCompleteRequest;
import com.edualto.course.dto.LessonVideoUploadUrlRequest;
import com.edualto.course.dto.LessonVideoUploadUrlResponse;
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
import com.edualto.user.repository.UserRepository;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LessonVideoService {
    private static final long MAX_VIDEO_SIZE_BYTES = 2L * 1024 * 1024 * 1024;
    private static final Duration UPLOAD_URL_TTL = Duration.ofMinutes(15);
    private static final Duration PLAYBACK_URL_TTL = Duration.ofMinutes(10);
    private static final Map<String, String> VIDEO_EXTENSIONS = Map.of(
            "video/mp4", "mp4",
            "video/webm", "webm"
    );
    private static final String VIDEO_KEY_PREFIX = "course-videos/";

    private final CourseRepository courses;
    private final SectionRepository sections;
    private final LessonRepository lessons;
    private final UserRepository users;
    private final EnrollmentService enrollments;
    private final StorageService storage;
    private final StorageCleanupService storageCleanup;

    public LessonVideoService(CourseRepository courses, SectionRepository sections,
            LessonRepository lessons, UserRepository users, EnrollmentService enrollments,
            StorageService storage, StorageCleanupService storageCleanup) {
        this.courses = courses;
        this.sections = sections;
        this.lessons = lessons;
        this.users = users;
        this.enrollments = enrollments;
        this.storage = storage;
        this.storageCleanup = storageCleanup;
    }

    @Transactional(readOnly = true)
    public LessonVideoUploadUrlResponse createUploadUrl(UUID instructorId, UUID courseId,
            UUID sectionId, UUID lessonId, LessonVideoUploadUrlRequest request) {
        Lesson lesson = requireInstructorLesson(instructorId, courseId, sectionId, lessonId);
        requireVideoLesson(lesson);
        if (!VIDEO_EXTENSIONS.containsKey(request.contentType()) || request.contentLength() > MAX_VIDEO_SIZE_BYTES) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_VIDEO_UPLOAD", "Chỉ hỗ trợ video MP4 hoặc WebM tối đa 2 GB");
        }
        String objectKey = VIDEO_KEY_PREFIX + courseId + "/" + lessonId + "/" + UUID.randomUUID()
                + "." + VIDEO_EXTENSIONS.get(request.contentType());
        PresignedUploadUrl signed = storage.generatePresignedUploadUrl(objectKey, request.contentType(),
                request.contentLength(), UPLOAD_URL_TTL, "private, no-store");
        return new LessonVideoUploadUrlResponse(signed.uploadUrl(), signed.objectKey(), signed.expiresAt());
    }

    @Transactional
    public void completeUpload(UUID instructorId, UUID courseId, UUID sectionId, UUID lessonId,
            LessonVideoUploadCompleteRequest request) {
        Lesson lesson = requireInstructorLesson(instructorId, courseId, sectionId, lessonId);
        requireVideoLesson(lesson);
        String keyPrefix = VIDEO_KEY_PREFIX + courseId + "/" + lessonId + "/";
        String objectKey = request.objectKey();
        if (!objectKey.startsWith(keyPrefix) || objectKey.substring(keyPrefix.length()).contains("/")) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_VIDEO_KEY", "Khóa video không hợp lệ cho bài học này");
        }
        ObjectMetadata metadata = storage.getObjectMetadata(objectKey);
        if (metadata == null || !VIDEO_EXTENSIONS.containsKey(metadata.contentType())
                || metadata.contentLength() < 1 || metadata.contentLength() > MAX_VIDEO_SIZE_BYTES) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "VIDEO_UPLOAD_NOT_FOUND", "Không tìm thấy video hợp lệ trên kho lưu trữ");
        }
        String extension = VIDEO_EXTENSIONS.get(metadata.contentType());
        if (!objectKey.endsWith("." + extension)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "VIDEO_TYPE_MISMATCH", "Định dạng video không khớp với tên tệp");
        }
        String previousKey = lesson.getMediaKey();
        lesson.attachMediaKey(objectKey);
        lessons.save(lesson);
        if (!objectKey.equals(previousKey) && isCourseVideoKey(previousKey)) {
            storageCleanup.deleteAfterCommit(List.of(previousKey));
        }
    }

    @Transactional(readOnly = true)
    public LessonVideoAccessResponse createPlaybackUrl(UUID studentId, UUID lessonId) {
        Lesson lesson = lessons.findById(lessonId)
                .filter(item -> item.getStatus() == LessonStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học"));
        requireVideoLesson(lesson);
        Section section = sections.findById(lesson.getSectionId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học"));
        Course course = courses.findById(section.getCourseId())
                .filter(item -> item.getStatus() == CourseStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        enrollments.requireEnrollment(studentId, course.getId());
        String mediaKey = lesson.getMediaKey();
        if (mediaKey == null || !mediaKey.startsWith(VIDEO_KEY_PREFIX + course.getId() + "/" + lessonId + "/")) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND", "Bài học chưa có video đã tải lên");
        }
        ObjectMetadata metadata = storage.getObjectMetadata(mediaKey);
        if (metadata == null || !VIDEO_EXTENSIONS.containsKey(metadata.contentType())
                || metadata.contentLength() < 1 || metadata.contentLength() > MAX_VIDEO_SIZE_BYTES
                || !mediaKey.endsWith("." + VIDEO_EXTENSIONS.get(metadata.contentType()))) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND", "Không tìm thấy video bài học");
        }
        PresignedDownloadUrl signed = storage.generatePresignedDownloadUrl(mediaKey, PLAYBACK_URL_TTL);
        return new LessonVideoAccessResponse(lessonId, signed.downloadUrl(), signed.expiresAt());
    }

    private Lesson requireInstructorLesson(UUID instructorId, UUID courseId, UUID sectionId, UUID lessonId) {
        User instructor = users.findById(instructorId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));
        boolean eligible = instructor.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.INSTRUCTOR || role.getName() == RoleName.ADMIN);
        if (!eligible) {
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

    private void requireVideoLesson(Lesson lesson) {
        if (lesson.getLessonType() != LessonType.VIDEO) {
            throw new BusinessException(HttpStatus.CONFLICT, "VIDEO_LESSON_REQUIRED", "Thao tác này chỉ áp dụng cho bài học video");
        }
    }

    private boolean isCourseVideoKey(String objectKey) {
        return objectKey != null && objectKey.startsWith(VIDEO_KEY_PREFIX);
    }

}
