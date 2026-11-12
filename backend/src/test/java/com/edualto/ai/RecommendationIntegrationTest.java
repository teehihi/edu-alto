package com.edualto.ai;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

class RecommendationIntegrationTest extends AbstractIntegrationTest {

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
            jdbcTemplate.update("DELETE FROM recommendation_feedbacks WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM recommendation_snapshots WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM learning_signals WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM user_learning_preferences WHERE user_id = ?", userId);
            jdbcTemplate.update("DELETE FROM learning_activities WHERE student_id = ?", userId);
            jdbcTemplate.update(
                    "DELETE FROM quiz_attempt_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE student_id = ?)",
                    userId
            );
            jdbcTemplate.update("DELETE FROM quiz_attempts WHERE student_id = ?", userId);
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
    void supportsGuestCourseRecommendationsOnboardingPreferencesNextLessonsAndFeedback() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        User student = createUser(RoleName.STUDENT);
        String studentToken = jwtTokenService.createAccessToken(student);

        Course springCourse = createPublishedCourse(
                instructor,
                "Spring Boot Thực Chiến & REST API",
                "Xây dựng backend Spring Boot với PostgreSQL và JWT",
                CourseLevel.INTERMEDIATE
        );
        Course javaStarter = createPublishedCourse(
                instructor,
                "Lập trình Java Cốt Lõi & OOP",
                "Nền tảng Java vững chắc cho backend Spring Boot",
                CourseLevel.BEGINNER
        );
        Course figmaCourse = createPublishedCourse(
                instructor,
                "Thiết kế Giao diện UI/UX với Figma",
                "Xây dựng prototype và design system chuẩn",
                CourseLevel.BEGINNER
        );

        Section javaSection = createSection(javaStarter, "Chương 1: OOP Cơ bản");
        Lesson lesson1 = createPublishedLesson(javaSection, "Bài 1: Lớp và Đối tượng", LessonType.TEXT, 1, 420);
        Lesson lesson2 = createPublishedLesson(javaSection, "Bài 2: Tính kế thừa trong Java", LessonType.VIDEO, 2, 780);
        Lesson quizLesson = createPublishedLesson(javaSection, "Bài 3: Kiểm tra OOP", LessonType.QUIZ, 3, 600);
        UUID quizId = insertQuiz(quizLesson.getId(), 70.0);

        // 1. Guest course recommendation with context course excludes context course
        mockMvc.perform(get("/api/v1/recommendations/courses")
                        .param("courseId", springCourse.getId().toString())
                        .param("limit", "4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.personalized").value(false))
                .andExpect(jsonPath("$.data.items[*].id", not(hasItem(springCourse.getId().toString()))));

        // 2. Student saves onboarding preferences -> prioritizes matching domain with Vietnamese reason
        mockMvc.perform(put("/api/v1/me/learning-preferences")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "preferredTopics": ["Java & Spring Boot"],
                                  "preferredLevel": "INTERMEDIATE",
                                  "learningGoal": "Xây dựng REST API Spring Boot chuyên nghiệp",
                                  "weeklyTargetHours": 8,
                                  "personalizationEnabled": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.data.preferredTopics[0]").value("Java & Spring Boot"));

        mockMvc.perform(get("/api/v1/recommendations/courses")
                        .header("Authorization", "Bearer " + studentToken)
                        .param("limit", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.personalized").value(true))
                .andExpect(jsonPath("$.data.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.data.items[0].id").value(springCourse.getId().toString()))
                .andExpect(jsonPath("$.data.items[0].reasonText", containsString("Java & Spring Boot")));

        // 3. Enroll in javaStarter, complete lesson1, fail quiz -> next learning recommendations show quiz review + lesson2
        UUID enrollmentId = insertEnrollment(student.getId(), javaStarter.getId());
        insertCompletedLesson(enrollmentId, javaStarter.getId(), javaSection.getId(), lesson1.getId());
        insertQuizAttempt(quizId, student.getId(), 40.0, false, Instant.now());

        mockMvc.perform(get("/api/v1/me/recommendations/learning")
                        .header("Authorization", "Bearer " + studentToken)
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.personalizationEnabled").value(true))
                .andExpect(jsonPath("$.data.items[*].lessonId", hasItem(quizLesson.getId().toString())))
                .andExpect(jsonPath("$.data.items[*].lessonId", hasItem(lesson2.getId().toString())))
                .andExpect(jsonPath("$.data.items[0].reasonCode").value("REVIEW_WEAK_QUIZ"));

        // 4. Enrolled course is excluded from course recommendations
        mockMvc.perform(get("/api/v1/recommendations/courses")
                        .header("Authorization", "Bearer " + studentToken)
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].id", not(hasItem(javaStarter.getId().toString()))));

        // 5. Dismiss feedback hides dismissed course on next fetch
        mockMvc.perform(post("/api/v1/me/recommendations/feedback")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("""
                                {
                                  "targetType": "COURSE",
                                  "targetId": "%s",
                                  "feedbackType": "DISMISSED"
                                }
                                """, figmaCourse.getId())))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/recommendations/courses")
                        .header("Authorization", "Bearer " + studentToken)
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].id", not(hasItem(figmaCourse.getId().toString()))));

        // 6. Opt out of personalization hides learning recommendations cleanly
        mockMvc.perform(put("/api/v1/me/learning-preferences")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "preferredTopics": [],
                                  "personalizationEnabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.personalizationEnabled").value(false));

        mockMvc.perform(get("/api/v1/me/recommendations/learning")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.personalizationEnabled").value(false))
                .andExpect(jsonPath("$.data.items").isEmpty());
    }

    private User createUser(RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, "Integration test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User("Rec User " + roleName, suffix + "@edualto.test", "not-a-real-hash");
        user.addRole(role);
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private Course createPublishedCourse(User instructor, String title, String tagline, CourseLevel level) {
        String suffix = UUID.randomUUID().toString();
        Course course = new Course(
                UUID.randomUUID(),
                instructor.getId(),
                title,
                "rec-course-" + suffix,
                tagline,
                title + " - " + tagline,
                BigDecimal.ZERO,
                null,
                level,
                "vi",
                null
        );
        course.setStatus(CourseStatus.PUBLISHED);
        course.setPublishedAt(Instant.now());
        Course saved = courseRepository.save(course);
        fixtureCourseIds.add(saved.getId());
        return saved;
    }

    private Section createSection(Course course, String title) {
        return sectionRepository.save(new Section(UUID.randomUUID(), course.getId(), title, null, 1));
    }

    private Lesson createPublishedLesson(Section section, String title, LessonType type, int pos, int durationSec) {
        return lessonRepository.save(new Lesson(
                UUID.randomUUID(),
                section.getId(),
                title,
                null,
                null,
                "Nội dung bài học",
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

    private void insertCompletedLesson(UUID enrollmentId, UUID courseId, UUID sectionId, UUID lessonId) {
        Timestamp now = Timestamp.from(Instant.now());
        jdbcTemplate.update("""
                INSERT INTO learning_progress (id, enrollment_id, course_id, section_id, lesson_id, completed_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), enrollmentId, courseId, sectionId, lessonId, now, now, now);
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
}
