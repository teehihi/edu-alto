package com.edualto.learning;

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
import com.edualto.enrollment.repository.EnrollmentRepository;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.dto.CourseProgressResponse;
import com.edualto.learning.service.LearningService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class EnrollmentLearningIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
    private EnrollmentRepository enrollmentRepository;

    @Autowired
    private EnrollmentService enrollmentService;

    @Autowired
    private LearningService learningService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final List<UUID> fixtureUserIds = new ArrayList<>();
    private final List<UUID> fixtureCourseIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID courseId : fixtureCourseIds) {
            jdbcTemplate.update("delete from learning_progress where course_id = ?", courseId);
            jdbcTemplate.update("delete from enrollments where course_id = ?", courseId);
        }
        courseRepository.deleteAllById(fixtureCourseIds);
        userRepository.deleteAllById(fixtureUserIds);
        fixtureCourseIds.clear();
        fixtureUserIds.clear();
    }

    @Test
    void freePublishedEnrollmentIsIdempotentAndPaidOrDraftCoursesAreRejected() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR, true);
        User student = createUser(RoleName.STUDENT, true);
        Course free = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);
        Course paid = createCourse(instructor, CourseStatus.PUBLISHED, new BigDecimal("1200.00"));
        Course draft = createCourse(instructor, CourseStatus.DRAFT, BigDecimal.ZERO);

        String token = tokenFor(student);
        String firstBody = enroll(token, free.getId()).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String secondBody = enroll(token, free.getId()).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String firstId = readJsonData(firstBody);
        String secondId = readJsonData(secondBody);
        assertThat(secondId).isEqualTo(firstId);
        assertThat(enrollmentRepository.findByStudentIdAndCourseId(student.getId(), free.getId())).isPresent();

        enroll(token, paid.getId()).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("PAYMENT_REQUIRED"));
        enroll(token, draft.getId()).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("COURSE_NOT_FOUND"));
        assertThat(enrollmentRepository.findByStudentIdAndCourseId(student.getId(), paid.getId())).isEmpty();
    }

    @Test
    void requiresAuthenticationAndAnActiveStudentAccount() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR, true);
        User inactiveStudent = createUser(RoleName.STUDENT, false);
        User activeInstructor = createUser(RoleName.INSTRUCTOR, true);
        Course course = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);

        mockMvc.perform(post("/api/v1/courses/{courseId}/enrollments", course.getId()))
                .andExpect(status().isUnauthorized());
        enroll(tokenFor(inactiveStudent), course.getId()).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("STUDENT_REQUIRED"));
        enroll(tokenFor(activeInstructor), course.getId()).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("STUDENT_REQUIRED"));
    }

    @Test
    void textCompletionIsIdempotentAndProgressCountsOnlyPublishedLessons() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR, true);
        User student = createUser(RoleName.STUDENT, true);
        Course course = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);
        Section section = createSection(course);
        Lesson first = createLesson(section, LessonType.TEXT, LessonStatus.PUBLISHED, 1);
        createLesson(section, LessonType.TEXT, LessonStatus.PUBLISHED, 2);
        createLesson(section, LessonType.TEXT, LessonStatus.DRAFT, 3);
        String token = tokenFor(student);
        enroll(token, course.getId()).andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/lessons/{lessonId}", first.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Bài học tích hợp 1"))
                .andExpect(jsonPath("$.data.content").value("Nội dung bài học kiểm thử"));

        mockMvc.perform(post("/api/v1/lessons/{lessonId}/complete", first.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalLessons").value(2))
                .andExpect(jsonPath("$.data.completedLessons").value(1))
                .andExpect(jsonPath("$.data.progressPercent").value(50))
                .andExpect(jsonPath("$.data.completed").value(false));

        Timestamp firstCompletedAt = jdbcTemplate.queryForObject(
                "select completed_at from learning_progress where lesson_id = ?", Timestamp.class, first.getId());

        mockMvc.perform(post("/api/v1/lessons/{lessonId}/complete", first.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalLessons").value(2))
                .andExpect(jsonPath("$.data.completedLessons").value(1));
        assertThat(jdbcTemplate.queryForObject("select count(*) from learning_progress where lesson_id = ?", Integer.class, first.getId()))
                .isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("select completed_at from learning_progress where lesson_id = ?",
                Timestamp.class, first.getId())).isEqualTo(firstCompletedAt);
    }

    @Test
    void quizCompletionIsRejectedAndStudentCannotReadAnotherStudentsCourse() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR, true);
        User enrolledStudent = createUser(RoleName.STUDENT, true);
        User otherStudent = createUser(RoleName.STUDENT, true);
        Course course = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);
        Section section = createSection(course);
        Lesson quiz = createLesson(section, LessonType.QUIZ, LessonStatus.PUBLISHED, 1);
        Lesson text = createLesson(section, LessonType.TEXT, LessonStatus.PUBLISHED, 2);
        String enrolledToken = tokenFor(enrolledStudent);
        String otherToken = tokenFor(otherStudent);
        enroll(enrolledToken, course.getId()).andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/lessons/{lessonId}/complete", quiz.getId())
                        .header("Authorization", "Bearer " + enrolledToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("LESSON_TYPE_NOT_SUPPORTED"));
        mockMvc.perform(get("/api/v1/lessons/{lessonId}", text.getId())
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));
        mockMvc.perform(get("/api/v1/me/enrollments")
                        .header("Authorization", "Bearer " + enrolledToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));
        mockMvc.perform(get("/api/v1/me/enrollments")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void archivedCourseAndInvalidEnrollmentHistoryPaginationAreRejected() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR, true);
        User student = createUser(RoleName.STUDENT, true);
        Course archived = createCourse(instructor, CourseStatus.ARCHIVED, BigDecimal.ZERO);
        String token = tokenFor(student);

        enroll(token, archived.getId()).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("COURSE_NOT_FOUND"));
        mockMvc.perform(get("/api/v1/me/enrollments?page=-1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGINATION"));
        mockMvc.perform(get("/api/v1/me/enrollments?size=101")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGINATION"));
        mockMvc.perform(get("/api/v1/me/enrollments?sort=title,asc")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGINATION"));
        mockMvc.perform(get("/api/v1/me/enrollments?page=invalid")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/courses/not-a-uuid/enrollments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void progressReportsCompleteAndEmptyCoursesAndArchivedCourseRetainsEnrollmentHistory() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR, true);
        User student = createUser(RoleName.STUDENT, true);
        Course course = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);
        Section section = createSection(course);
        Lesson lesson = createLesson(section, LessonType.TEXT, LessonStatus.PUBLISHED, 1);
        String token = tokenFor(student);
        enroll(token, course.getId()).andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/lessons/{lessonId}/complete", lesson.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalLessons").value(1))
                .andExpect(jsonPath("$.data.completedLessons").value(1))
                .andExpect(jsonPath("$.data.progressPercent").value(100))
                .andExpect(jsonPath("$.data.completed").value(true));

        Course emptyCourse = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);
        enroll(token, emptyCourse.getId()).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/me/courses/{courseId}/progress", emptyCourse.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalLessons").value(0))
                .andExpect(jsonPath("$.data.completedLessons").value(0))
                .andExpect(jsonPath("$.data.progressPercent").value(0))
                .andExpect(jsonPath("$.data.completed").value(false));

        course.setStatus(CourseStatus.ARCHIVED);
        courseRepository.save(course);
        mockMvc.perform(get("/api/v1/lessons/{lessonId}", lesson.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("COURSE_NOT_FOUND"));
        mockMvc.perform(get("/api/v1/me/courses/{courseId}/progress", course.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("COURSE_NOT_FOUND"));
        mockMvc.perform(get("/api/v1/me/enrollments")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void concurrentEnrollmentAndCompletionCallsKeepOneDatabaseRecordEach() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR, true);
        User student = createUser(RoleName.STUDENT, true);
        Course course = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);
        Section section = createSection(course);
        Lesson lesson = createLesson(section, LessonType.TEXT, LessonStatus.PUBLISHED, 1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<UUID> firstEnrollment = executor.submit(() -> enrollmentService.enroll(student.getId(), course.getId()));
            Future<UUID> secondEnrollment = executor.submit(() -> enrollmentService.enroll(student.getId(), course.getId()));
            UUID enrollmentId = firstEnrollment.get(10, TimeUnit.SECONDS);
            assertThat(secondEnrollment.get(10, TimeUnit.SECONDS)).isEqualTo(enrollmentId);
            assertThat(jdbcTemplate.queryForObject("select count(*) from enrollments where student_id = ? and course_id = ?",
                    Integer.class, student.getId(), course.getId())).isEqualTo(1);

            Future<CourseProgressResponse> firstCompletion = executor.submit(() -> learningService.complete(student.getId(), lesson.getId()));
            Future<CourseProgressResponse> secondCompletion = executor.submit(() -> learningService.complete(student.getId(), lesson.getId()));
            assertThat(firstCompletion.get(10, TimeUnit.SECONDS).completedLessons()).isEqualTo(1);
            assertThat(secondCompletion.get(10, TimeUnit.SECONDS).completedLessons()).isEqualTo(1);
            assertThat(jdbcTemplate.queryForObject("select count(*) from learning_progress where enrollment_id = ? and lesson_id = ?",
                    Integer.class, enrollmentId, lesson.getId())).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void databaseRejectsCrossCourseProgressAndDuplicateEnrollmentRows() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR, true);
        User student = createUser(RoleName.STUDENT, true);
        Course courseA = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);
        Course courseB = createCourse(instructor, CourseStatus.PUBLISHED, BigDecimal.ZERO);
        Section sectionA = createSection(courseA);
        Section sectionB = createSection(courseB);
        Lesson lessonB = createLesson(sectionB, LessonType.TEXT, LessonStatus.PUBLISHED, 1);
        String token = tokenFor(student);
        enroll(token, courseA.getId()).andExpect(status().isOk());
        UUID enrollmentId = enrollmentRepository.findByStudentIdAndCourseId(student.getId(), courseA.getId())
                .orElseThrow().getId();

        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into learning_progress (id, enrollment_id, course_id, section_id, lesson_id, completed_at, created_at, updated_at)
                values (?, ?, ?, ?, ?, current_timestamp, current_timestamp, current_timestamp)
                """, UUID.randomUUID(), enrollmentId, courseA.getId(), sectionB.getId(), lessonB.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(sectionA.getCourseId()).isEqualTo(courseA.getId());

        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into enrollments (id, student_id, course_id, status, enrolled_at, created_at, updated_at)
                values (?, ?, ?, 'ACTIVE', current_timestamp, current_timestamp, current_timestamp)
                """, UUID.randomUUID(), student.getId(), courseA.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private ResultActions enroll(String token, UUID courseId) throws Exception {
        return mockMvc.perform(post("/api/v1/courses/{courseId}/enrollments", courseId)
                .header("Authorization", "Bearer " + token));
    }

    private String tokenFor(User user) {
        return jwtTokenService.createAccessToken(user);
    }

    private User createUser(RoleName roleName, boolean active) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, "Integration test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User("Integration " + roleName, suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        if (active) {
            user.activate();
        }
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private Course createCourse(User instructor, CourseStatus courseStatus, BigDecimal price) {
        String suffix = UUID.randomUUID().toString();
        Course course = new Course(UUID.randomUUID(), instructor.getId(), "Khóa học tích hợp", "integration-" + suffix,
                null, "Mô tả khóa học tích hợp", price, null, CourseLevel.ALL_LEVELS, "vi", null);
        course.setStatus(courseStatus);
        if (courseStatus == CourseStatus.PUBLISHED) {
            course.setPublishedAt(Instant.now());
        }
        Course saved = courseRepository.save(course);
        fixtureCourseIds.add(saved.getId());
        return saved;
    }

    private Section createSection(Course course) {
        return sectionRepository.save(new Section(UUID.randomUUID(), course.getId(), "Chương học tích hợp", null, 1));
    }

    private Lesson createLesson(Section section, LessonType lessonType, LessonStatus lessonStatus, int position) {
        return lessonRepository.save(new Lesson(UUID.randomUUID(), section.getId(), "Bài học tích hợp " + position,
                null, null, "Nội dung bài học kiểm thử", lessonType, position, 60, false, null, lessonStatus));
    }

    private String readJsonData(String json) throws Exception {
        return objectMapper.readTree(json).get("data").asText();
    }
}
