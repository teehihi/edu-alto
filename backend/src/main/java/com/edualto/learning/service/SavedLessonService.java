package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonType;
import com.edualto.course.dto.LearningLessonResponse;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.service.CourseLearningAccessService;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.dto.SavedLessonResponse;
import com.edualto.learning.repository.SavedLessonRepository;
import com.edualto.learning.repository.SavedLessonRepository.SavedLessonRow;
import com.edualto.user.service.UserService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedLessonService {
    private final SavedLessonRepository savedLessons;
    private final UserService users;
    private final CourseLearningAccessService courses;
    private final LessonRepository lessons;
    private final EnrollmentService enrollments;

    public SavedLessonService(SavedLessonRepository savedLessons, UserService users,
                              CourseLearningAccessService courses, LessonRepository lessons,
                              EnrollmentService enrollments) {
        this.savedLessons = savedLessons;
        this.users = users;
        this.courses = courses;
        this.lessons = lessons;
        this.enrollments = enrollments;
    }

    @Transactional(readOnly = true)
    public Page<SavedLessonResponse> list(UUID userId, int page, int size) {
        users.requireActiveStudent(userId);
        validatePage(page, size);
        return savedLessons.findAllResponsesByUserId(userId, PageRequest.of(page, size,
                        Sort.by(Sort.Direction.DESC, "savedAt").and(Sort.by(Sort.Direction.ASC, "id"))))
                .map(this::toResponse);
    }

    @Transactional
    public SavedLessonResponse save(UUID userId, UUID lessonId) {
        users.requireActiveStudent(userId);
        LearningLessonResponse lessonInfo = courses.requirePublishedLesson(lessonId);
        Lesson lesson = lessons.findById(lessonId).orElseThrow(() -> lessonNotFound());
        if (!lesson.isPreview()) {
            enrollments.requireEnrollment(userId, lessonInfo.courseId());
        }
        savedLessons.insertIfAbsent(UUID.randomUUID(), userId, lessonId);
        return savedLessons.findResponseByUserIdAndLessonId(userId, lessonId)
                .map(this::toResponse).orElseThrow(this::lessonNotFound);
    }

    @Transactional
    public void delete(UUID userId, UUID lessonId) {
        users.requireActiveStudent(userId);
        savedLessons.deleteByUserIdAndLessonId(userId, lessonId);
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang bài học đã lưu không hợp lệ");
        }
    }

    private BusinessException lessonNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học");
    }

    private SavedLessonResponse toResponse(SavedLessonRow row) {
        return new SavedLessonResponse(row.getId(), row.getLessonId(), row.getCourseId(), row.getCourseSlug(),
                row.getCourseTitle(), row.getSectionTitle(), row.getLessonTitle(),
                LessonType.valueOf(row.getLessonType()), row.getDurationSeconds(), row.getSavedAt());
    }
}
