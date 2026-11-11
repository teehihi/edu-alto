package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.Lesson;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.enrollment.domain.CourseEnrolledEvent;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.domain.LearningActivity;
import com.edualto.learning.domain.LearningActivityType;
import com.edualto.learning.dto.LearningActivityResponse;
import com.edualto.learning.dto.LearningActivitySummaryResponse;
import com.edualto.learning.dto.LearningActivitySyncResponse;
import com.edualto.learning.dto.LearningActivityTypeInfoDto;
import com.edualto.learning.dto.RecordLearningActivityRequest;
import com.edualto.learning.repository.LearningActivityRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@Service
public class LearningActivityService {

    private static final ObjectMapper JSON_MAPPER = JsonMapper.builder().build();

    private final LearningActivityRepository activityRepository;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final EnrollmentService enrollmentService;
    private final JdbcTemplate jdbcTemplate;

    public LearningActivityService(
            LearningActivityRepository activityRepository,
            CourseRepository courseRepository,
            LessonRepository lessonRepository,
            EnrollmentService enrollmentService,
            JdbcTemplate jdbcTemplate
    ) {
        this.activityRepository = activityRepository;
        this.courseRepository = courseRepository;
        this.lessonRepository = lessonRepository;
        this.enrollmentService = enrollmentService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public LearningActivityResponse recordActivity(UUID studentId, RecordLearningActivityRequest request) {
        Objects.requireNonNull(studentId, "studentId must not be null");
        Objects.requireNonNull(request, "request must not be null");

        Course course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));

        // If not enrolling, require active enrollment
        if (request.activityType() != LearningActivityType.COURSE_ENROLLED) {
            enrollmentService.requireEnrollment(studentId, course.getId());
        }

        Instant occurredAt = request.occurredAt() != null ? request.occurredAt() : Instant.now();
        Instant maxAllowedFutureTime = Instant.now().plus(Duration.ofMinutes(5));
        if (occurredAt.isAfter(maxAllowedFutureTime)) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OCCURRED_AT",
                    "Thời điểm diễn ra sự kiện không thể vượt quá thời gian hiện tại"
            );
        }

        UUID sectionId = request.sectionId();
        UUID lessonId = request.lessonId();
        String lessonTitle = null;

        if (lessonId != null) {
            Lesson lesson = lessonRepository.findById(lessonId)
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học"));
            sectionId = lesson.getSectionId();
            lessonTitle = lesson.getTitle();
        }

        String normalizedMetadata = normalizeMetadataJson(request.metadata());

        LearningActivity activity = new LearningActivity(
                studentId,
                course.getId(),
                sectionId,
                lessonId,
                request.activityType(),
                occurredAt,
                normalizedMetadata
        );

        LearningActivity saved = activityRepository.save(activity);

        return new LearningActivityResponse(
                saved.getId(),
                saved.getStudentId(),
                saved.getCourseId(),
                course.getTitle(),
                saved.getSectionId(),
                saved.getLessonId(),
                lessonTitle,
                saved.getActivityType(),
                saved.getActivityType().displayName(),
                saved.getActivityType().category(),
                saved.getOccurredAt(),
                saved.getMetadata()
        );
    }

    @Transactional
    public LearningActivity recordActivityDirect(
            UUID studentId,
            UUID courseId,
            UUID sectionId,
            UUID lessonId,
            LearningActivityType activityType,
            UUID sourceId,
            Instant occurredAt,
            String metadata
    ) {
        if (studentId == null || courseId == null || activityType == null) {
            return null;
        }

        if (sourceId != null && activityRepository.existsBySourceIdAndActivityType(sourceId, activityType)) {
            return null;
        }

        LearningActivity activity = new LearningActivity(
                studentId,
                courseId,
                sectionId,
                lessonId,
                activityType,
                sourceId,
                occurredAt != null ? occurredAt : Instant.now(),
                metadata
        );

        return activityRepository.save(activity);
    }

    @EventListener
    @Transactional
    public void onCourseEnrolled(CourseEnrolledEvent event) {
        recordActivityDirect(
                event.studentId(),
                event.courseId(),
                null,
                null,
                LearningActivityType.COURSE_ENROLLED,
                event.enrollmentId(),
                event.occurredAt(),
                event.metadata()
        );
    }

    @Transactional(readOnly = true)
    public Page<LearningActivityResponse> getStudentActivities(
            UUID studentId,
            UUID courseId,
            Instant from,
            Instant to,
            Pageable pageable
    ) {
        Page<LearningActivity> activities;

        if (courseId != null && from != null && to != null) {
            activities = activityRepository.findByStudentIdAndCourseIdAndOccurredAtBetweenOrderByOccurredAtDesc(
                    studentId, courseId, from, to, pageable
            );
        } else if (courseId != null) {
            activities = activityRepository.findByStudentIdAndCourseIdOrderByOccurredAtDesc(studentId, courseId, pageable);
        } else if (from != null && to != null) {
            activities = activityRepository.findByStudentIdAndOccurredAtBetweenOrderByOccurredAtDesc(studentId, from, to, pageable);
        } else {
            activities = activityRepository.findByStudentIdOrderByOccurredAtDesc(studentId, pageable);
        }

        return mapToResponsePage(activities);
    }

    @Transactional(readOnly = true)
    public LearningActivitySummaryResponse getStudentSummary(UUID studentId) {
        long totalActivities = activityRepository.countByStudentId(studentId);

        Long distinctDays = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT DATE_TRUNC('day', occurred_at)) FROM learning_activities WHERE student_id = ?",
                Long.class,
                studentId
        );

        Map<String, Long> countByCategory = new HashMap<>();
        jdbcTemplate.query(
                "SELECT activity_type, COUNT(*) as cnt FROM learning_activities WHERE student_id = ? GROUP BY activity_type",
                rs -> {
                    String typeStr = rs.getString("activity_type");
                    try {
                        LearningActivityType type = LearningActivityType.valueOf(typeStr);
                        countByCategory.merge(type.category(), rs.getLong("cnt"), Long::sum);
                    } catch (IllegalArgumentException ignored) {
                        countByCategory.merge("OTHER", rs.getLong("cnt"), Long::sum);
                    }
                },
                studentId
        );

        return new LearningActivitySummaryResponse(
                totalActivities,
                distinctDays != null ? distinctDays : 0L,
                countByCategory
        );
    }

    @Transactional(readOnly = true)
    public Page<LearningActivityResponse> getCourseActivitiesForInstructor(
            UUID instructorId,
            UUID courseId,
            Instant from,
            Instant to,
            Pageable pageable
    ) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));

        if (!course.getInstructorId().equals(instructorId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền xem hoạt động của khóa học này");
        }

        Page<LearningActivity> activities;
        if (from != null && to != null) {
            activities = activityRepository.findByCourseIdAndOccurredAtBetweenOrderByOccurredAtDesc(courseId, from, to, pageable);
        } else {
            activities = activityRepository.findByCourseIdOrderByOccurredAtDesc(courseId, pageable);
        }

        return mapToResponsePage(activities);
    }

    @Transactional
    public LearningActivitySyncResponse syncHistoricalActivities() {
        int lessonsSynced = jdbcTemplate.update("""
                INSERT INTO learning_activities (id, student_id, course_id, section_id, lesson_id, activity_type, source_id, metadata, occurred_at, created_at, updated_at)
                SELECT gen_random_uuid(), e.student_id, p.course_id, p.section_id, p.lesson_id, 'LESSON_COMPLETED', p.id,
                       CASE WHEN l.duration_seconds IS NOT NULL AND l.duration_seconds > 0
                            THEN jsonb_build_object('duration_seconds', l.duration_seconds)
                            ELSE NULL END,
                       p.completed_at, current_timestamp, current_timestamp
                FROM learning_progress p
                JOIN enrollments e ON e.id = p.enrollment_id
                LEFT JOIN lessons l ON l.id = p.lesson_id
                ON CONFLICT (source_id, activity_type) DO NOTHING
                """);

        int quizzesSynced = jdbcTemplate.update("""
                INSERT INTO learning_activities (id, student_id, course_id, section_id, lesson_id, activity_type, source_id, metadata, occurred_at, created_at, updated_at)
                SELECT gen_random_uuid(), a.student_id, s.course_id, l.section_id, l.id, 'QUIZ_SUBMITTED', a.id,
                       jsonb_build_object('score', a.score, 'passed', a.passed, 'correctCount', a.correct_answers, 'totalCount', a.total_questions),
                       a.submitted_at, current_timestamp, current_timestamp
                FROM quiz_attempts a
                JOIN quizzes q ON q.id = a.quiz_id
                JOIN lessons l ON l.id = q.lesson_id
                JOIN sections s ON s.id = l.section_id
                ON CONFLICT (source_id, activity_type) DO NOTHING
                """);

        int assignmentsSubmitted = jdbcTemplate.update("""
                INSERT INTO learning_activities (id, student_id, course_id, section_id, lesson_id, activity_type, source_id, metadata, occurred_at, created_at, updated_at)
                SELECT gen_random_uuid(), sub.student_id, a.course_id, NULL, NULL, 'ASSIGNMENT_SUBMITTED', sub.id, NULL,
                       sub.submitted_at, current_timestamp, current_timestamp
                FROM assignment_submissions sub
                JOIN assignments a ON a.id = sub.assignment_id
                ON CONFLICT (source_id, activity_type) DO NOTHING
                """);

        int assignmentsGraded = jdbcTemplate.update("""
                INSERT INTO learning_activities (id, student_id, course_id, section_id, lesson_id, activity_type, source_id, metadata, occurred_at, created_at, updated_at)
                SELECT gen_random_uuid(), sub.student_id, a.course_id, NULL, NULL, 'ASSIGNMENT_GRADED', sub.id,
                       jsonb_build_object('score', sub.score, 'maxScore', a.max_score),
                       sub.graded_at, current_timestamp, current_timestamp
                FROM assignment_submissions sub
                JOIN assignments a ON a.id = sub.assignment_id
                WHERE sub.score IS NOT NULL AND sub.graded_at IS NOT NULL
                ON CONFLICT (source_id, activity_type) DO NOTHING
                """);

        int enrollmentsSynced = jdbcTemplate.update("""
                INSERT INTO learning_activities (id, student_id, course_id, section_id, lesson_id, activity_type, source_id, metadata, occurred_at, created_at, updated_at)
                SELECT gen_random_uuid(), e.student_id, e.course_id, NULL, NULL, 'COURSE_ENROLLED', e.id, NULL,
                       e.enrolled_at, current_timestamp, current_timestamp
                FROM enrollments e
                WHERE e.status = 'ACTIVE'
                ON CONFLICT (source_id, activity_type) DO NOTHING
                """);

        long totalActivities = activityRepository.count();

        return new LearningActivitySyncResponse(
                lessonsSynced,
                quizzesSynced,
                assignmentsSubmitted + assignmentsGraded,
                enrollmentsSynced,
                totalActivities
        );
    }

    public List<LearningActivityTypeInfoDto> getStandardizedActivityTypes() {
        return Arrays.stream(LearningActivityType.values())
                .map(LearningActivityTypeInfoDto::from)
                .collect(Collectors.toList());
    }

    private String normalizeMetadataJson(String rawMetadata) {
        if (rawMetadata == null || rawMetadata.isBlank()) {
            return null;
        }
        String trimmed = rawMetadata.trim();
        try {
            JSON_MAPPER.readTree(trimmed);
            return trimmed;
        } catch (JacksonException ex) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_ACTIVITY_METADATA",
                    "Dữ liệu metadata phải là chuỗi JSON hợp lệ"
            );
        }
    }

    private Page<LearningActivityResponse> mapToResponsePage(Page<LearningActivity> activities) {
        if (activities.isEmpty()) {
            return activities.map(a -> null);
        }

        List<UUID> courseIds = activities.getContent().stream()
                .map(LearningActivity::getCourseId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<UUID> lessonIds = activities.getContent().stream()
                .map(LearningActivity::getLessonId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<UUID, String> courseTitles = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, Course::getTitle));

        Map<UUID, String> lessonTitles = lessonRepository.findAllById(lessonIds).stream()
                .collect(Collectors.toMap(Lesson::getId, Lesson::getTitle));

        return activities.map(a -> new LearningActivityResponse(
                a.getId(),
                a.getStudentId(),
                a.getCourseId(),
                courseTitles.getOrDefault(a.getCourseId(), ""),
                a.getSectionId(),
                a.getLessonId(),
                a.getLessonId() != null ? lessonTitles.getOrDefault(a.getLessonId(), "") : null,
                a.getActivityType(),
                a.getActivityType().displayName(),
                a.getActivityType().category(),
                a.getOccurredAt(),
                a.getMetadata()
        ));
    }
}
