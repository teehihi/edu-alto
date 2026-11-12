package com.edualto.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

class InstructorAnalyticsIntegrationTest extends AbstractIntegrationTest {

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
    private final List<UUID> fixtureOrderIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID orderId : fixtureOrderIds) {
            jdbcTemplate.update("delete from order_items where order_id = ?", orderId);
            jdbcTemplate.update("delete from orders where id = ?", orderId);
        }
        for (UUID courseId : fixtureCourseIds) {
            jdbcTemplate.update("delete from course_reviews where course_id = ?", courseId);
            jdbcTemplate.update("delete from certificates where course_id = ?", courseId);
            jdbcTemplate.update("delete from learning_progress where course_id = ?", courseId);
            jdbcTemplate.update("delete from enrollments where course_id = ?", courseId);
        }
        courseRepository.deleteAllById(fixtureCourseIds);
        userRepository.deleteAllById(fixtureUserIds);
        fixtureOrderIds.clear();
        fixtureCourseIds.clear();
        fixtureUserIds.clear();
    }

    @Test
    void overviewSupportsAllCoursesAndSingleCourseFilterAndEnforcesAccess() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        User otherInstructor = createUser(RoleName.INSTRUCTOR);
        User student = createUser(RoleName.STUDENT);

        Course courseA = createPublishedCourse(instructor, "Khóa học Java", new BigDecimal("500000"));
        Section sectionA = createSection(courseA);
        Lesson lessonA1 = createPublishedTextLesson(sectionA, 1);
        createPublishedTextLesson(sectionA, 2);

        Course courseB = createPublishedCourse(instructor, "Khóa học Python", new BigDecimal("300000"));
        Section sectionB = createSection(courseB);
        Lesson lessonB1 = createPublishedTextLesson(sectionB, 1);
        createDraftTextLesson(sectionB, 2);

        UUID enrollmentA = insertEnrollment(student.getId(), courseA.getId());
        insertEnrollment(student.getId(), courseB.getId());
        insertCompletedLesson(enrollmentA, courseA.getId(), sectionA.getId(), lessonA1.getId());
        insertCertificate(student, courseA, enrollmentA, "EA-TEST-1001");
        insertPaidOrder(student.getId(), courseA);
        insertReview(student.getId(), courseA.getId(), 5, "Khóa học rất hữu ích");

        // Verify courseB stays part of overview metrics while courseA has 1/2 completed
        String instructorToken = jwtTokenService.createAccessToken(instructor);
        String otherInstructorToken = jwtTokenService.createAccessToken(otherInstructor);
        String studentToken = jwtTokenService.createAccessToken(student);

        // 1. All courses overview (nullable courseId filter against real PostgreSQL)
        mockMvc.perform(get("/api/v1/instructor/analytics/overview")
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.totalStudents").value(1))
                .andExpect(jsonPath("$.data.summary.totalRevenue").value(500000))
                .andExpect(jsonPath("$.data.summary.totalCertificates").value(1))
                .andExpect(jsonPath("$.data.summary.totalCompletedLessons").value(1))
                .andExpect(jsonPath("$.data.monthlyTrends", hasSize(12)))
                .andExpect(jsonPath("$.data.coursePerformances", hasSize(2)))
                .andExpect(jsonPath("$.data.coursePerformances[0].courseId").value(courseA.getId().toString()))
                .andExpect(jsonPath("$.data.coursePerformances[0].completionRate").value(50.0))
                .andExpect(jsonPath("$.data.coursePerformances[0].averageRating").value(5.0))
                .andExpect(jsonPath("$.data.coursePerformances[0].reviewCount").value(1))
                .andExpect(jsonPath("$.data.coursePerformances[1].courseId").value(courseB.getId().toString()))
                .andExpect(jsonPath("$.data.coursePerformances[1].completionRate").value(0.0))
                .andExpect(jsonPath("$.data.coursePerformances[1].totalLessons").value(1))
                .andExpect(jsonPath("$.data.coursePerformances[1].averageRating").value(0.0))
                .andExpect(jsonPath("$.data.coursePerformances[1].reviewCount").value(0));

        // 2. Single course filter via query param and path variable
        mockMvc.perform(get("/api/v1/instructor/analytics/overview")
                        .param("courseId", courseB.getId().toString())
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.totalStudents").value(1))
                .andExpect(jsonPath("$.data.summary.totalRevenue").value(0))
                .andExpect(jsonPath("$.data.summary.totalCompletedLessons").value(0))
                .andExpect(jsonPath("$.data.coursePerformances", hasSize(1)))
                .andExpect(jsonPath("$.data.coursePerformances[0].courseId").value(courseB.getId().toString()));

        mockMvc.perform(get("/api/v1/instructor/analytics/courses/{courseId}", courseA.getId())
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.totalRevenue").value(500000))
                .andExpect(jsonPath("$.data.summary.totalCompletedLessons").value(1))
                .andExpect(jsonPath("$.data.coursePerformances", hasSize(1)))
                .andExpect(jsonPath("$.data.coursePerformances[0].totalLessons").value(2));

        // Keep lessonB1 referenced to assert 1 lesson exists in courseB
        mockMvc.perform(get("/api/v1/instructor/analytics/courses/{courseId}", courseB.getId())
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.coursePerformances[0].totalLessons").value(1));

        // 3. Ownership and RBAC enforcement
        mockMvc.perform(get("/api/v1/instructor/analytics/overview")
                        .param("courseId", courseA.getId().toString())
                        .header("Authorization", "Bearer " + otherInstructorToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("COURSE_NOT_FOUND"));

        mockMvc.perform(get("/api/v1/instructor/analytics/overview")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/instructor/analytics/overview"))
                .andExpect(status().isUnauthorized());

        assertThat(lessonB1.getId()).isNotNull();
    }

    private User createUser(RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, "Integration test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User("Analytics " + roleName, suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private Course createPublishedCourse(User instructor, String title, BigDecimal price) {
        String suffix = UUID.randomUUID().toString();
        Course course = new Course(
                UUID.randomUUID(),
                instructor.getId(),
                title,
                "analytics-" + suffix,
                null,
                "Mô tả khóa học phân tích",
                price,
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
        return sectionRepository.save(new Section(UUID.randomUUID(), course.getId(), "Chương 1", null, 1));
    }

    private Lesson createPublishedTextLesson(Section section, int position) {
        return createTextLesson(section, position, LessonStatus.PUBLISHED);
    }

    private Lesson createDraftTextLesson(Section section, int position) {
        return createTextLesson(section, position, LessonStatus.DRAFT);
    }

    private Lesson createTextLesson(Section section, int position, LessonStatus status) {
        return lessonRepository.save(new Lesson(
                UUID.randomUUID(),
                section.getId(),
                "Bài học " + position,
                null,
                null,
                "Nội dung bài học",
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

    private void insertCertificate(User student, Course course, UUID enrollmentId, String number) {
        jdbcTemplate.update("""
                INSERT INTO certificates (id, student_id, course_id, enrollment_id, certificate_number, student_name, course_title, instructor_name, issued_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Instructor', current_timestamp, current_timestamp)
                """, UUID.randomUUID(), student.getId(), course.getId(), enrollmentId, number, student.getFullName(), course.getTitle());
    }

    private void insertPaidOrder(UUID studentId, Course course) {
        UUID orderId = UUID.randomUUID();
        String transferRef = "EA" + orderId.toString().replace("-", "").substring(0, 20).toUpperCase();
        fixtureOrderIds.add(orderId);
        jdbcTemplate.update("""
                INSERT INTO orders (id, student_id, status, currency, subtotal, discount_total, total, transfer_reference, created_at, updated_at)
                VALUES (?, ?, 'PAID', 'VND', ?, 0, ?, ?, current_timestamp, current_timestamp)
                """, orderId, studentId, course.getPrice(), course.getPrice(), transferRef);
        jdbcTemplate.update("""
                INSERT INTO order_items (id, order_id, course_id, course_title, unit_price, list_price, discount_amount, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, current_timestamp)
                """, UUID.randomUUID(), orderId, course.getId(), course.getTitle(), course.getPrice(), course.getPrice());
    }

    private void insertReview(UUID studentId, UUID courseId, int rating, String comment) {
        jdbcTemplate.update("""
                INSERT INTO course_reviews (id, student_id, course_id, rating, comment, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'PUBLISHED', current_timestamp, current_timestamp)
                """, UUID.randomUUID(), studentId, courseId, rating, comment);
    }
}
