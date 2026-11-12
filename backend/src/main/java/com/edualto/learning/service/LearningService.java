package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.certificate.service.CertificateService;
import com.edualto.course.domain.LessonType;
import com.edualto.course.dto.LearningLessonResponse;
import com.edualto.course.service.CourseLearningAccessService;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.domain.LearningActivityType;
import com.edualto.learning.dto.CourseProgressResponse;
import com.edualto.learning.dto.CourseProgressSummaryResponse;
import com.edualto.learning.repository.LearningProgressRepository;
import com.edualto.learning.repository.LearningProgressRepository.ProgressCounts;
import com.edualto.user.service.UserService;
import java.time.Instant;
import java.util.List;
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
    private final UserService users;

    public LearningService(CourseLearningAccessService courses, EnrollmentService enrollments,
            LearningProgressRepository progress, CertificateService certificates,
            LearningActivityService learningActivities, UserService users) {
        this.courses = courses;
        this.enrollments = enrollments;
        this.progress = progress;
        this.certificates = certificates;
        this.learningActivities = learningActivities;
        this.users = users;
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
        CourseProgressResponse summary = summarize(enrollmentId, lesson.courseId());
        if (inserted > 0) {
            Instant completedAt = Instant.now();
            learningActivities.recordActivityDirect(
                    studentId,
                    lesson.courseId(),
                    lesson.sectionId(),
                    lesson.id(),
                    LearningActivityType.LESSON_COMPLETED,
                    progressId,
                    completedAt,
                    null
            );
            if (summary.completed()) {
                learningActivities.recordActivityDirect(
                        studentId,
                        lesson.courseId(),
                        null,
                        null,
                        LearningActivityType.COURSE_COMPLETED,
                        enrollmentId,
                        completedAt,
                        "{\"source\":\"lesson_completion\"}"
                );
            }
        }
        return summary;
    }

    @Transactional
    public CourseProgressResponse getProgress(UUID studentId, UUID courseId) {
        UUID enrollmentId = enrollments.requireEnrollment(studentId, courseId);
        courses.requirePublishedCourse(courseId);
        certificates.issueIfEligible(studentId, courseId);
        return summarize(enrollmentId, courseId);
    }

    @Transactional(readOnly = true)
    public List<CourseProgressSummaryResponse> getBatchProgressSummary(UUID studentId) {
        users.requireActiveStudent(studentId);
        return progress.findBatchProgressSummary(studentId).stream()
                .map(row -> {
                    long total = row.getTotalLessons();
                    long completed = row.getCompletedLessons();
                    int percent = total == 0 ? 0 : (int) Math.round(((double) completed / (double) total) * 100.0);
                    return new CourseProgressSummaryResponse(
                            row.getCourseId(),
                            total,
                            completed,
                            percent,
                            total > 0 && completed >= total
                    );
                })
                .toList();
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
        if (lesson.lessonType() != LessonType.TEXT
                && lesson.lessonType() != LessonType.VIDEO
                && lesson.lessonType() != LessonType.QUIZ) {
            throw new BusinessException(HttpStatus.CONFLICT, "LESSON_TYPE_NOT_SUPPORTED",
                    "Loại bài học này hiện chưa hỗ trợ");
        }
    }

    private void requireCompletableLesson(LearningLessonResponse lesson) {
        if (lesson.lessonType() != LessonType.TEXT && lesson.lessonType() != LessonType.VIDEO) {
            throw new BusinessException(HttpStatus.CONFLICT, "LESSON_TYPE_NOT_SUPPORTED",
                    "Chỉ bài học văn bản và video có thể được đánh dấu hoàn thành trực tiếp");
        }
    }
}
