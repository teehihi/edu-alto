package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.CourseInstructorSummaryResponse;
import com.edualto.course.repository.CourseRepository;
import com.edualto.learning.domain.CourseWishlistEvent;
import com.edualto.learning.dto.FavoriteCourseResponse;
import com.edualto.learning.repository.CourseWishlistRepository;
import com.edualto.learning.repository.CourseWishlistRepository.WishlistCourseRow;
import com.edualto.storage.service.StorageService;
import com.edualto.user.service.UserService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CourseWishlistService {
    private final CourseWishlistRepository wishlists;
    private final CourseRepository courses;
    private final UserService users;
    private final StorageService storage;
    private final ApplicationEventPublisher eventPublisher;

    public CourseWishlistService(CourseWishlistRepository wishlists, CourseRepository courses,
                                 UserService users, StorageService storage) {
        this(wishlists, courses, users, storage, null);
    }

    @Autowired
    public CourseWishlistService(CourseWishlistRepository wishlists, CourseRepository courses,
                                 UserService users, StorageService storage,
                                 ApplicationEventPublisher eventPublisher) {
        this.wishlists = wishlists;
        this.courses = courses;
        this.users = users;
        this.storage = storage;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public Page<FavoriteCourseResponse> list(UUID userId, int page, int size) {
        users.requireActiveStudent(userId);
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION",
                    "Phân trang khóa học yêu thích không hợp lệ");
        }
        var pageable = PageRequest.of(page, size);
        var rows = wishlists.findPublishedByUserId(userId, size, Math.toIntExact(pageable.getOffset()));
        return new PageImpl<>(rows.stream().map(this::toResponse).toList(), pageable,
                wishlists.countPublishedByUserId(userId));
    }

    @Transactional
    public void save(UUID userId, UUID courseId) {
        users.requireActiveStudent(userId);
        Course course = courses.findById(courseId).orElseThrow(this::courseNotFound);
        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw courseNotFound();
        }
        int inserted = wishlists.insertIfAbsent(UUID.randomUUID(), userId, courseId);
        if (inserted > 0 && eventPublisher != null) {
            eventPublisher.publishEvent(new CourseWishlistEvent(userId, courseId, true, Instant.now()));
        }
    }

    @Transactional
    public void delete(UUID userId, UUID courseId) {
        users.requireActiveStudent(userId);
        int deleted = wishlists.delete(userId, courseId);
        if (deleted > 0 && eventPublisher != null) {
            eventPublisher.publishEvent(new CourseWishlistEvent(userId, courseId, false, Instant.now()));
        }
    }

    private FavoriteCourseResponse toResponse(WishlistCourseRow row) {
        var instructor = new CourseInstructorSummaryResponse(row.instructorId(), row.instructorName(),
                publicUrl(row.instructorAvatarKey()), row.instructorHeadline(), row.instructorCustomHandle());
        return new FavoriteCourseResponse(row.courseId(), row.title(), row.slug(), row.tagline(),
                publicUrl(row.thumbnailKey()), row.price(), row.originalPrice(), CourseLevel.valueOf(row.level()),
                row.language(), CourseStatus.valueOf(row.status()), row.publishedAt(), instructor, row.savedAt());
    }

    private String publicUrl(String key) {
        return key == null || key.isBlank() ? null : storage.getPublicUrl(key);
    }

    private BusinessException courseNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
    }
}
