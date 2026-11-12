package com.edualto.admin;

import com.edualto.AbstractIntegrationTest;
import com.edualto.admin.dto.AdminAnalyticsResponse;
import com.edualto.admin.dto.AdminTopCourseDto;
import com.edualto.admin.dto.AdminUserResponse;
import com.edualto.admin.repository.AdminRepository;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class AdminRepositoryIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AdminRepository adminRepository;

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

    @BeforeEach
    void setUp() {
        cleanAllData();
    }

    @AfterEach
    void tearDown() {
        cleanAllData();
        if (!fixtureUserIds.isEmpty()) {
            userRepository.deleteAllById(fixtureUserIds);
            fixtureUserIds.clear();
        }
    }

    private void cleanAllData() {
        jdbcTemplate.update("delete from quiz_attempt_activity_events");
        jdbcTemplate.update("delete from quiz_attempt_answers");
        jdbcTemplate.update("delete from quiz_attempt_session_questions");
        jdbcTemplate.update("delete from quiz_attempt_sessions");
        jdbcTemplate.update("delete from quiz_attempts");
        jdbcTemplate.update("delete from course_reviews");
        jdbcTemplate.update("delete from certificates");
        jdbcTemplate.update("delete from learning_progress");
        jdbcTemplate.update("delete from enrollments");
        jdbcTemplate.update("delete from payments");
        jdbcTemplate.update("delete from order_items");
        jdbcTemplate.update("delete from orders");
        lessonRepository.deleteAll();
        sectionRepository.deleteAll();
        courseRepository.deleteAll();
    }

    @Test
    void listUsersWithRoleFilterReturnsAllRolesOfMultiRoleUser() {
        User multiRoleUser = createUser("Multi Role", RoleName.STUDENT, RoleName.INSTRUCTOR);
        User studentOnlyUser = createUser("Student Only", RoleName.STUDENT);

        Page<AdminUserResponse> result = adminRepository.listUsers(0, 50, null, "INSTRUCTOR");

        assertThat(result.getContent())
                .extracting(AdminUserResponse::id)
                .contains(multiRoleUser.getId())
                .doesNotContain(studentOnlyUser.getId());

        AdminUserResponse found = result.getContent().stream()
                .filter(user -> user.id().equals(multiRoleUser.getId()))
                .findFirst()
                .orElseThrow();
        assertThat(found.roles()).containsExactlyInAnyOrder("INSTRUCTOR", "STUDENT");
    }

    @Test
    void getAnalyticsReturnsZeroDefaultsWhenQuizAttemptsAndPublishedReviewsAreEmpty() {
        User instructor = createUser("Instructor Empty", RoleName.INSTRUCTOR);
        User student = createUser("Student Empty", RoleName.STUDENT);
        Course course = createCourse(instructor, "Empty Course", BigDecimal.valueOf(100000), CourseStatus.PUBLISHED);
        insertReview(student.getId(), course.getId(), 5, "Hidden review", "HIDDEN");

        AdminAnalyticsResponse analytics = adminRepository.getAnalytics();

        assertThat(analytics.averageQuizScore()).isEqualTo(0.0);
        assertThat(analytics.averageCourseRating()).isEqualTo(0.0);
        assertThat(analytics.totalReviewsCount()).isZero();
        assertThat(analytics.courseCompletionRate()).isEqualTo(0.0);
    }

    @Test
    void getTopCoursesExcludesUnpaidOrdersAndAvoidsCartesianMultiplication() {
        User instructor = createUser("Top Instructor", RoleName.INSTRUCTOR);
        User student1 = createUser("Top Student 1", RoleName.STUDENT);
        User student2 = createUser("Top Student 2", RoleName.STUDENT);

        Course topCourse = createCourse(instructor, "Top Course", BigDecimal.valueOf(500000), CourseStatus.PUBLISHED);
        Course noReviewCourse = createCourse(instructor, "No Review Course", BigDecimal.valueOf(200000), CourseStatus.PUBLISHED);

        insertEnrollment(student1.getId(), topCourse.getId());
        insertEnrollment(student2.getId(), topCourse.getId());
        insertEnrollment(student1.getId(), noReviewCourse.getId());

        insertReview(student1.getId(), topCourse.getId(), 4, "Good", "PUBLISHED");
        insertReview(student2.getId(), topCourse.getId(), 5, "Great", "PUBLISHED");

        insertOrder(student1.getId(), topCourse, "PAID");
        insertOrder(student2.getId(), topCourse, "PENDING_PAYMENT");
        insertOrder(student2.getId(), topCourse, "PAYMENT_FAILED");

        List<AdminTopCourseDto> topCourses = adminRepository.getDashboardSummary("30days").topCourses();

        assertThat(topCourses).hasSize(2);
        AdminTopCourseDto first = topCourses.get(0);
        assertThat(first.id()).isEqualTo(topCourse.getId());
        assertThat(first.studentsCount()).isEqualTo(2L);
        assertThat(first.revenue()).isEqualByComparingTo(BigDecimal.valueOf(500000));
        assertThat(first.rating()).isEqualTo(4.5);

        AdminTopCourseDto second = topCourses.get(1);
        assertThat(second.id()).isEqualTo(noReviewCourse.getId());
        assertThat(second.studentsCount()).isEqualTo(1L);
        assertThat(second.revenue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(second.rating()).isEqualTo(0.0);
    }

    @Test
    void getAnalyticsCompletionRateIgnoresUnenrolledDraftCoursesAndDraftLessons() {
        User instructor = createUser("Analytics Instructor", RoleName.INSTRUCTOR);
        User student1 = createUser("Analytics Student 1", RoleName.STUDENT);
        User student2 = createUser("Analytics Student 2", RoleName.STUDENT);

        Course enrolledCourse = createCourse(instructor, "Enrolled Course", BigDecimal.valueOf(300000), CourseStatus.PUBLISHED);
        Section enrolledSection = sectionRepository.save(new Section(UUID.randomUUID(), enrolledCourse.getId(), "Section 1", null, 1));
        Lesson published1 = createLesson(enrolledSection.getId(), 1, LessonStatus.PUBLISHED);
        createLesson(enrolledSection.getId(), 2, LessonStatus.PUBLISHED);
        createLesson(enrolledSection.getId(), 3, LessonStatus.DRAFT);

        Course unenrolledDraft = createCourse(instructor, "Unenrolled Draft", BigDecimal.valueOf(300000), CourseStatus.DRAFT);
        Section draftSection = sectionRepository.save(new Section(UUID.randomUUID(), unenrolledDraft.getId(), "Draft Section", null, 1));
        for (int i = 1; i <= 10; i++) {
            createLesson(draftSection.getId(), i, LessonStatus.PUBLISHED);
        }

        UUID enrollment1 = insertEnrollment(student1.getId(), enrolledCourse.getId());
        insertEnrollment(student2.getId(), enrolledCourse.getId());
        insertCompletedLesson(enrollment1, enrolledCourse.getId(), enrolledSection.getId(), published1.getId());

        AdminAnalyticsResponse analytics = adminRepository.getAnalytics();

        assertThat(analytics.totalEnrollmentsCount()).isEqualTo(2L);
        assertThat(analytics.completedLessonsCount()).isEqualTo(1L);
        assertThat(analytics.courseCompletionRate()).isEqualTo(25.0);
    }

    private User createUser(String fullName, RoleName... roleNames) {
        String suffix = UUID.randomUUID().toString();
        User user = new User(fullName, "admin-repo-" + suffix + "@edualto.test", "not-a-real-password-hash");
        for (RoleName roleName : roleNames) {
            Role role = roleRepository.findByName(roleName)
                    .orElseGet(() -> roleRepository.save(new Role(roleName, "Integration test role")));
            user.addRole(role);
        }
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private Course createCourse(User instructor, String title, BigDecimal price, CourseStatus status) {
        Course course = new Course(
                UUID.randomUUID(),
                instructor.getId(),
                title,
                "admin-repo-" + UUID.randomUUID(),
                null,
                "Course description",
                price,
                null,
                CourseLevel.INTERMEDIATE,
                "vi",
                null
        );
        course.setStatus(status);
        if (status == CourseStatus.PUBLISHED) {
            course.setPublishedAt(Instant.now());
        }
        return courseRepository.save(course);
    }

    private Lesson createLesson(UUID sectionId, int position, LessonStatus status) {
        return lessonRepository.save(new Lesson(
                UUID.randomUUID(),
                sectionId,
                "Lesson " + position,
                "lesson-" + position + "-" + UUID.randomUUID(),
                null,
                "Content",
                LessonType.TEXT,
                position,
                120,
                false,
                null,
                status
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

    private void insertCompletedLesson(UUID enrollmentId, UUID courseId, UUID sectionId, UUID lessonId) {
        jdbcTemplate.update("""
                INSERT INTO learning_progress (id, enrollment_id, course_id, section_id, lesson_id, completed_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, current_timestamp, current_timestamp, current_timestamp)
                """, UUID.randomUUID(), enrollmentId, courseId, sectionId, lessonId);
    }

    private void insertOrder(UUID studentId, Course course, String status) {
        UUID orderId = UUID.randomUUID();
        String transferRef = "EA" + orderId.toString().replace("-", "").substring(0, 20).toUpperCase();
        jdbcTemplate.update("""
                INSERT INTO orders (id, student_id, status, currency, subtotal, discount_total, total, transfer_reference, created_at, updated_at)
                VALUES (?, ?, ?, 'VND', ?, 0, ?, ?, current_timestamp, current_timestamp)
                """, orderId, studentId, status, course.getPrice(), course.getPrice(), transferRef);
        jdbcTemplate.update("""
                INSERT INTO order_items (id, order_id, course_id, course_title, unit_price, list_price, discount_amount, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, current_timestamp)
                """, UUID.randomUUID(), orderId, course.getId(), course.getTitle(), course.getPrice(), course.getPrice());
    }

    private void insertReview(UUID studentId, UUID courseId, int rating, String comment, String status) {
        jdbcTemplate.update("""
                INSERT INTO course_reviews (id, student_id, course_id, rating, comment, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, current_timestamp, current_timestamp)
                """, UUID.randomUUID(), studentId, courseId, rating, comment, status);
    }
}
