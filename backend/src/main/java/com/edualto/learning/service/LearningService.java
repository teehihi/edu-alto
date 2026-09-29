package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.LessonType;
import com.edualto.course.dto.LearningLessonResponse;
import com.edualto.course.service.CourseLearningAccessService;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.dto.CourseProgressResponse;
import com.edualto.learning.repository.LearningProgressRepository;
import com.edualto.learning.repository.LearningProgressRepository.ProgressCounts;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningService {
    private final CourseLearningAccessService courses;
    private final EnrollmentService enrollments;
    private final LearningProgressRepository progress;

    public LearningService(CourseLearningAccessService courses, EnrollmentService enrollments, LearningProgressRepository progress) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.progress = progress;
    }

    @Transactional(readOnly = true)
    public LearningLessonResponse getLesson(UUID studentId, UUID lessonId) {
        LearningLessonResponse lesson = courses.requirePublishedLesson(lessonId);
        enrollments.requireEnrollment(studentId, lesson.courseId());
        requireTextLesson(lesson);
        return lesson;
    }

    @Transactional
    public CourseProgressResponse complete(UUID studentId, UUID lessonId) {
        LearningLessonResponse lesson = courses.requirePublishedLesson(lessonId);
        UUID enrollmentId = enrollments.requireEnrollment(studentId, lesson.courseId());
        requireTextLesson(lesson);
        progress.completeIfAbsent(UUID.randomUUID(), enrollmentId, lesson.courseId(), lesson.sectionId(), lesson.id());
        return summarize(enrollmentId, lesson.courseId());
    }

    @Transactional(readOnly = true)
    public CourseProgressResponse getProgress(UUID studentId, UUID courseId) {
        UUID enrollmentId = enrollments.requireEnrollment(studentId, courseId);
        courses.requirePublishedCourse(courseId);
        return summarize(enrollmentId, courseId);
    }

    private CourseProgressResponse summarize(UUID enrollmentId, UUID courseId) {
        ProgressCounts counts = progress.countProgress(enrollmentId, courseId);
        long total = counts.getTotalLessons();
        long completed = counts.getCompletedLessons();
        return new CourseProgressResponse(courseId, total, completed,
                total == 0 ? 0 : (int) (completed * 100 / total), total > 0 && completed == total);
    }

    private void requireTextLesson(LearningLessonResponse lesson) {
        if (lesson.lessonType() != LessonType.TEXT) {
            throw new BusinessException(HttpStatus.CONFLICT, "LESSON_TYPE_NOT_SUPPORTED", "Hiện tại chỉ hỗ trợ học và xác nhận hoàn thành bài học văn bản");
        }
    }
}
