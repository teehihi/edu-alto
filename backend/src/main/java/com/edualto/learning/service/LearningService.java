package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.certificate.service.CertificateService;
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
    private final CertificateService certificates;

    public LearningService(CourseLearningAccessService courses, EnrollmentService enrollments,
            LearningProgressRepository progress, CertificateService certificates) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.progress = progress;
        this.certificates = certificates;
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
        progress.completeIfAbsent(UUID.randomUUID(), enrollmentId, lesson.courseId(), lesson.sectionId(), lesson.id());
        certificates.issueIfEligible(studentId, lesson.courseId());
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
        return new CourseProgressResponse(courseId, total, completed,
                total == 0 ? 0 : (int) (completed * 100 / total), total > 0 && completed == total);
    }

    private void requireReadableLesson(LearningLessonResponse lesson) {
        if (lesson.lessonType() != LessonType.TEXT
                && lesson.lessonType() != LessonType.VIDEO
                && lesson.lessonType() != LessonType.QUIZ) {
            throw new BusinessException(HttpStatus.CONFLICT, "LESSON_TYPE_NOT_SUPPORTED", "Loại bài học này hiện chưa hỗ trợ");
        }
    }

    private void requireCompletableLesson(LearningLessonResponse lesson) {
        if (lesson.lessonType() != LessonType.TEXT && lesson.lessonType() != LessonType.VIDEO) {
            throw new BusinessException(HttpStatus.CONFLICT, "LESSON_TYPE_NOT_SUPPORTED", "Chỉ bài học văn bản và video có thể được đánh dấu hoàn thành trực tiếp");
        }
    }
}
