package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.certificate.service.CertificateService;
import com.edualto.course.domain.LessonType;
import com.edualto.course.dto.LearningLessonResponse;
import com.edualto.course.service.CourseLearningAccessService;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.domain.LearningActivityType;
import com.edualto.learning.dto.CourseProgressResponse;
import com.edualto.learning.repository.LearningProgressRepository;
import com.edualto.learning.repository.LearningProgressRepository.ProgressCounts;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningService {
    private final CourseLearningAccessService courses;
    private final EnrollmentService enrollments;
    private final LearningProgressRepository progress;
    private final CertificateService certificates;
    private final LearningActivityService learningActivities;

    public LearningService(CourseLearningAccessService courses, EnrollmentService enrollments,
            LearningProgressRepository progress, CertificateService certificates,
            LearningActivityService learningActivities) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.progress = progress;
        this.certificates = certificates;
        this.learningActivities = learningActivities;
    }

    @Transactional(readOnly = true)
    public LearningLessonResponse getLesson(UUID studentId, UUID lessonId) {
        LearningLessonResponse lesson = courses.requirePublishedLesson(lessonId);
        enrollments.requireEnrollment(studentId, lesson.courseId());
        requireReadableLesson(lesson);
        return lesson;
    }

    @Transactional
    public CourseProgressResponse complete(UUID studentId, UUID lessonId) {
        LearningLessonResponse lesson = courses.requirePublishedLesson(lessonId);
        UUID enrollmentId = enrollments.requireEnrollment(studentId, lesson.courseId());
        requireCompletableLesson(lesson);
        UUID progressId = UUID.randomUUID();
        int inserted = progress.completeIfAbsent(progressId, enrollmentId, lesson.courseId(), lesson.sectionId(), lesson.id());
        certificates.issueIfEligible(studentId, lesson.courseId());
        if (inserted > 0) {
            learningActivities.recordActivityDirect(
                    studentId,
                    lesson.courseId(),
                    lesson.sectionId(),
                    lesson.id(),
                    LearningActivityType.LESSON_COMPLETED,
                    progressId,
                    Instant.now(),
                    null
            );
        }
        return summarize(enrollmentId, lesson.courseId());
    }

    @Transactional
    public CourseProgressResponse getProgress(UUID studentId, UUID courseId) {
        UUID enrollmentId = enrollments.requireEnrollment(studentId, courseId);
        courses.requirePublishedCourse(courseId);
        certificates.issueIfEligible(studentId, courseId);
        return summarize(enrollmentId, courseId);
    }

    private CourseProgressResponse summarize(UUID enrollmentId, UUID courseId) {
        ProgressCounts counts = progress.countProgress(enrollmentId, courseId);
        long total = counts.getTotalLessons();
        long completed = counts.getCompletedLessons();
        int percent = total == 0 ? 0 : (int) Math.round(((double) completed / (double) total) * 100.0);
        return new CourseProgressResponse(courseId, total, completed, percent, total > 0 && completed >= total,
                progress.findCompletedLessonIds(enrollmentId, courseId));
    }

    private void requireReadableLesson(LearningLessonResponse lesson) {
        if (lesson.lessonType() == LessonType.QUIZ) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_LESSON_TYPE",
                    "Bài học dạng QUIZ được truy cập qua endpoint trắc nghiệm riêng.");
        }
    }

    private void requireCompletableLesson(LearningLessonResponse lesson) {
        if (lesson.lessonType() == LessonType.QUIZ) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_LESSON_TYPE",
                    "Bài học dạng QUIZ chỉ được hoàn thành thông qua nộp bài kiểm tra đạt điểm qua.");
        }
    }
}
