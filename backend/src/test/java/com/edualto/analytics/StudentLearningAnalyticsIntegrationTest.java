package com.edualto.analytics;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.domain.Section;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

class StudentLearningAnalyticsIntegrationTest extends AbstractIntegrationTest {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenService jwtTokenService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final List<UUID> fixtureUserIds = new ArrayList<>();
    private final List<UUID> fixtureCourseIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("DELETE FROM learning_activities WHERE student_id = ?", userId);
            jdbcTemplate.update(
                    "DELETE FROM quiz_attempt_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE student_id = ?)",
                    userId
            );
            jdbcTemplate.update("DELETE FROM quiz_attempts WHERE student_id = ?", userId);
            jdbcTemplate.update("DELETE FROM assignment_submissions WHERE student_id = ?", userId);
        }
        for (UUID courseId : fixtureCourseIds) {
            jdbcTemplate.update("DELETE FROM learning_activities WHERE course_id = ?", courseId);
            jdbcTemplate.update("DELETE FROM learning_progress WHERE course_id = ?", courseId);
            jdbcTemplate.update("DELETE FROM enrollments WHERE course_id = ?", courseId);
        }
        courseRepository.deleteAllById(fixtureCourseIds);
        userRepository.deleteAllById(fixtureUserIds);
        fixtureCourseIds.clear();
        fixtureUserIds.clear();
    }

    @Test
    void analyticsEndpointsReturnRealMetricsRespectTimezoneAndEnforceIsolation() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        User studentA = createUser(RoleName.STUDENT);
        User studentB = createUser(RoleName.STUDENT);

        Course courseA = createPublishedCourse(instructor, "Khoa hoc Phan tich Du lieu");
        Section sectionA = createSection(courseA);
        Lesson videoLesson = createPublishedLesson(sectionA, "Bai 1: Video ETL", LessonType.VIDEO, 1, 900);
        Lesson quizLesson1 = createPublishedLesson(sectionA, "Bai 2: Quiz 1", LessonType.QUIZ, 2, 600);
        Lesson quizLesson2 = createPublishedLesson(sectionA, "Bai 3: Quiz 2", LessonType.QUIZ, 3, 600);

        Course unenrolledCourse = createPublishedCourse(instructor, "Khoa hoc Khac Chua Dang Ky");
        Section unenrolledSection = createSection(unenrolledCourse);
        createPublishedLesson(unenrolledSection, "Bai 1", LessonType.TEXT, 1, 300);

        UUID quiz1Id = insertQuiz(quizLesson1.getId(), 70.0);
        UUID quiz2Id = insertQuiz(quizLesson2.getId(), 70.0);

        UUID enrollmentA = insertEnrollment(studentA.getId(), courseA.getId());

        // VN timezone boundary check:
        // 23:30 +07:00 yesterday (= 16:30 UTC yesterday) & early today in VN, always <= now
        Instant nowInstant = Instant.now();
        LocalDate todayVn = nowInstant.atZone(VN_ZONE).toLocalDate();
        Instant yesterdayLateVn = ZonedDateTime.of(todayVn.minusDays(1).atTime(23, 30), VN_ZONE).toInstant();
        Instant candidateTodayEarly = ZonedDateTime.of(todayVn.atTime(0, 15), VN_ZONE).toInstant();
        Instant todayEarlyVn = candidateTodayEarly.isAfter(nowInstant) ? nowInstant.minusSeconds(60) : candidateTodayEarly;

        // Video telemetry (1800s = 0.5h) + completed lesson (900s metadata should NOT double count)
        insertActivity(studentA.getId(), courseA.getId(), sectionA.getId(), videoLesson.getId(),
                "VIDEO_WATCHED", "{\"duration_seconds\":1800,\"position_seconds\":900}", yesterdayLateVn);
        insertActivity(studentA.getId(), courseA.getId(), sectionA.getId(), videoLesson.getId(),
                "LESSON_COMPLETED", "{\"duration_seconds\":900}", yesterdayLateVn.plusSeconds(60));
        insertCompletedLesson(enrollmentA, courseA.getId(), sectionA.getId(), videoLesson.getId(), yesterdayLateVn);

        // Today activity (1800s = 0.5h) -> total window = 1.0h, streak = 2 days
        insertActivity(studentA.getId(), courseA.getId(), sectionA.getId(), quizLesson1.getId(),
                "QUIZ_SUBMITTED", "{\"durationSeconds\":1800,\"score\":90}", todayEarlyVn);

        // Quiz 1 retaken: first failed 40, second passed 90 -> best = 9.0, passed = true
        insertQuizAttempt(quiz1Id, studentA.getId(), 40.0, false, yesterdayLateVn);
        insertQuizAttempt(quiz1Id, studentA.getId(), 90.0, true, todayEarlyVn);
        // Quiz 2 failed 50 -> triggers FAILED_QUIZ focus item
        insertQuizAttempt(quiz2Id, studentA.getId(), 50.0, false, todayEarlyVn);

        // Assignments: 1 graded (16/20 = 8.0), 1 overdue unsubmitted -> triggers OVERDUE_ASSIGNMENT
        UUID assign1Id = insertAssignment(courseA.getId(), instructor.getId(), "Bai tap 1",
                todayEarlyVn.plusSeconds(86400), 20.0);
        insertAssignment(courseA.getId(), instructor.getId(), "Bai tap qua han",
                yesterdayLateVn.minusSeconds(2 * 86400L), 10.0);
        insertAssignmentSubmission(assign1Id, studentA.getId(), yesterdayLateVn, 16.0, instructor.getId(), todayEarlyVn);

        String studentAToken = jwtTokenService.createAccessToken(studentA);
        String studentBToken = jwtTokenService.createAccessToken(studentB);
        String instructorToken = jwtTokenService.createAccessToken(instructor);

        // 1. Overview for studentA (7 days)
        mockMvc.perform(get("/api/v1/me/learning-analytics")
                        .param("days", "7")
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.windowDays").value(7))
                .andExpect(jsonPath("$.data.currentWeekActivity", hasSize(7)))
                .andExpect(jsonPath("$.data.windowDailyActivity", hasSize(7)))
                .andExpect(jsonPath("$.data.summary.activeCourseCount").value(1))
                .andExpect(jsonPath("$.data.summary.totalLessons").value(3))
                .andExpect(jsonPath("$.data.summary.completedLessons").value(1))
                .andExpect(jsonPath("$.data.summary.currentStreakDays").value(2))
                .andExpect(jsonPath("$.data.summary.activeDaysInWindow").value(2))
                .andExpect(jsonPath("$.data.summary.estimatedStudyHoursInWindow").value(1.0))
                .andExpect(jsonPath("$.data.summary.averageQuizScoreOutOf10").value(7.0))
                .andExpect(jsonPath("$.data.summary.quizPassRate").value(50.0))
                .andExpect(jsonPath("$.data.summary.averageAssignmentScoreOutOf10").value(8.0))
                .andExpect(jsonPath("$.data.focusItems[*].type", hasItem("FAILED_QUIZ")))
                .andExpect(jsonPath("$.data.focusItems[*].type", hasItem("OVERDUE_ASSIGNMENT")));

        // 2. Overview for 30 days
        mockMvc.perform(get("/api/v1/me/learning-analytics")
                        .param("days", "30")
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.windowDays").value(30))
                .andExpect(jsonPath("$.data.windowDailyActivity", hasSize(30)));

        // 3. Course detail for enrolled courseA
        mockMvc.perform(get("/api/v1/me/learning-analytics/courses/{courseId}", courseA.getId())
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.course.courseId").value(courseA.getId().toString()))
                .andExpect(jsonPath("$.data.quizzes", hasSize(2)))
                .andExpect(jsonPath("$.data.quizzes[0].passed").value(true))
                .andExpect(jsonPath("$.data.quizzes[0].bestScoreOutOf10").value(9.0))
                .andExpect(jsonPath("$.data.quizzes[1].passed").value(false))
                .andExpect(jsonPath("$.data.assignments", hasSize(2)));

        // 4. Isolation: studentB has empty analytics & cannot read courseA
        mockMvc.perform(get("/api/v1/me/learning-analytics")
                        .header("Authorization", "Bearer " + studentBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.activeCourseCount").value(0))
                .andExpect(jsonPath("$.data.summary.currentStreakDays").value(0))
                .andExpect(jsonPath("$.data.summary.averageQuizScoreOutOf10").value(nullValue()));

        mockMvc.perform(get("/api/v1/me/learning-analytics/courses/{courseId}", unenrolledCourse.getId())
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));

        // 5. Validation & RBAC
        mockMvc.perform(get("/api/v1/me/learning-analytics")
                        .param("days", "14")
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ANALYTICS_WINDOW"));

        mockMvc.perform(get("/api/v1/me/learning-analytics")
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("STUDENT_REQUIRED"));

        mockMvc.perform(get("/api/v1/me/learning-analytics"))
                .andExpect(status().isUnauthorized());
    }

    private User createUser(RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, "Integration test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User("Student Analytics " + roleName, suffix + "@edualto.test", "not-a-real-hash");
        user.addRole(role);
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private Course createPublishedCourse(User instructor, String title) {
        String suffix = UUID.randomUUID().toString();
        Course course = new Course(
                UUID.randomUUID(),
                instructor.getId(),
                title,
                "student-analytics-" + suffix,
                null,
                "Mo ta khoa hoc",
                BigDecimal.ZERO,
                null,
                CourseLevel.INTERMEDIATE,
                "vi",
                null
        );
        course.setStatus(CourseStatus.PUBLISHED);
        course.setPublishedAt(Instant.now());
        Course saved = courseRepository.save(course);
        fixtureCourseIds.add(saved.getId());
        return saved;
    }

    private Section createSection(Course course) {
        return sectionRepository.save(new Section(UUID.randomUUID(), course.getId(), "Chuong 1", null, 1));
    }

    private Lesson createPublishedLesson(Section section, String title, LessonType type, int pos, int durationSec) {
        return lessonRepository.save(new Lesson(
                UUID.randomUUID(),
                section.getId(),
                title,
                null,
                null,
                "Noi dung bai hoc",
                type,
                pos,
                durationSec,
                false,
                null,
                LessonStatus.PUBLISHED
        ));
    }

    private UUID insertEnrollment(UUID studentId, UUID courseId) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO enrollments (id, student_id, course_id, status, enrolled_at, created_at, updated_at)
                VALUES (?, ?, ?, 'ACTIVE', current_timestamp, current_timestamp, current_timestamp)
                """, id, studentId, courseId);
        return id;
    }

    private void insertCompletedLesson(UUID enrollmentId, UUID courseId, UUID sectionId, UUID lessonId, Instant completedAt) {
        Timestamp ts = Timestamp.from(completedAt);
        jdbcTemplate.update("""
                INSERT INTO learning_progress (id, enrollment_id, course_id, section_id, lesson_id, completed_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), enrollmentId, courseId, sectionId, lessonId, ts, ts, ts);
    }

    private void insertActivity(
            UUID studentId,
            UUID courseId,
            UUID sectionId,
            UUID lessonId,
            String activityType,
            String metadataJson,
            Instant occurredAt
    ) {
        Timestamp ts = Timestamp.from(occurredAt);
        jdbcTemplate.update("""
                INSERT INTO learning_activities (id, student_id, course_id, section_id, lesson_id, activity_type, metadata, occurred_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?)
                """, UUID.randomUUID(), studentId, courseId, sectionId, lessonId, activityType, metadataJson, ts, ts, ts);
    }

    private UUID insertQuiz(UUID lessonId, double passingScore) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO quizzes (id, lesson_id, passing_score, questions_per_attempt, duration_minutes, created_at)
                VALUES (?, ?, ?, 10, 15, current_timestamp)
                """, id, lessonId, BigDecimal.valueOf(passingScore));
        return id;
    }

    private void insertQuizAttempt(UUID quizId, UUID studentId, double score, boolean passed, Instant submittedAt) {
        jdbcTemplate.update("""
                INSERT INTO quiz_attempts (id, quiz_id, student_id, score, correct_answers, total_questions, passed, submitted_at)
                VALUES (?, ?, ?, ?, ?, 10, ?, ?)
                """, UUID.randomUUID(), quizId, studentId, BigDecimal.valueOf(score), (int) (score / 10), passed, Timestamp.from(submittedAt));
    }

    private UUID insertAssignment(UUID courseId, UUID instructorId, String title, Instant dueAt, double maxScore) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO assignments (id, course_id, instructor_id, title, description, due_at, max_score, status, created_at, updated_at, published_at)
                VALUES (?, ?, ?, ?, 'Mo ta bai tap', ?, ?, 'PUBLISHED', current_timestamp, current_timestamp, current_timestamp)
                """, id, courseId, instructorId, title, Timestamp.from(dueAt), BigDecimal.valueOf(maxScore));
        return id;
    }

    private void insertAssignmentSubmission(
            UUID assignmentId,
            UUID studentId,
            Instant submittedAt,
            Double score,
            UUID gradedBy,
            Instant gradedAt
    ) {
        jdbcTemplate.update("""
                INSERT INTO assignment_submissions (id, assignment_id, student_id, response_text, submitted_at, score, feedback, graded_by, graded_at, created_at, updated_at)
                VALUES (?, ?, ?, 'Bai nop cua hoc vien', ?, ?, 'Nhan xet', ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                assignmentId,
                studentId,
                Timestamp.from(submittedAt),
                score != null ? BigDecimal.valueOf(score) : null,
                gradedBy,
                gradedAt != null ? Timestamp.from(gradedAt) : null,
                Timestamp.from(submittedAt),
                Timestamp.from(gradedAt != null ? gradedAt : submittedAt)
        );
    }
}
