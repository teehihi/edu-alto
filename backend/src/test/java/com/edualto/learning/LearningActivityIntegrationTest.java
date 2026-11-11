package com.edualto.learning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class LearningActivityIntegrationTest extends AbstractIntegrationTest {

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
    private JdbcTemplate jdbcTemplate;

    private final List<UUID> fixtureUserIds = new ArrayList<>();
    private final List<UUID> fixtureCourseIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID courseId : fixtureCourseIds) {
            jdbcTemplate.update("delete from learning_activities where course_id = ?", courseId);
            jdbcTemplate.update("delete from discussions where course_id = ?", courseId);
            jdbcTemplate.update("delete from learning_progress where course_id = ?", courseId);
            jdbcTemplate.update("delete from enrollments where course_id = ?", courseId);
        }
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("delete from learning_notes where user_id = ?", userId);
        }
        courseRepository.deleteAllById(fixtureCourseIds);
        userRepository.deleteAllById(fixtureUserIds);
        fixtureCourseIds.clear();
        fixtureUserIds.clear();
    }

    @Test
    void recordsReadsValidatesMetadataAndEnforcesRbacAcrossRoles() throws Exception {
        User admin = createUser(RoleName.ADMIN);
        User instructor = createUser(RoleName.INSTRUCTOR);
        User otherInstructor = createUser(RoleName.INSTRUCTOR);
        User student = createUser(RoleName.STUDENT);
        User legacyStudent = createUser(RoleName.STUDENT);

        Course course = createPublishedCourse(instructor);
        Section section = sectionRepository.save(new Section(UUID.randomUUID(), course.getId(), "Chương 1", null, 1));
        Lesson videoLesson = lessonRepository.save(new Lesson(
                UUID.randomUUID(), section.getId(), "Video 1", null, null, "Mô tả",
                LessonType.VIDEO, 1, 300, false, null, LessonStatus.PUBLISHED));
        Lesson quizLesson = lessonRepository.save(new Lesson(
                UUID.randomUUID(), section.getId(), "Quiz 1", null, null, "Mô tả",
                LessonType.QUIZ, 2, 180, false, null, LessonStatus.PUBLISHED));

        String adminToken = jwtTokenService.createAccessToken(admin);
        String instructorToken = jwtTokenService.createAccessToken(instructor);
        String otherInstructorToken = jwtTokenService.createAccessToken(otherInstructor);
        String studentToken = jwtTokenService.createAccessToken(student);

        // Instructor creates quiz on quizLesson
        String createQuizBody = """
                {"passingScore":50,"questionsPerAttempt":0,"durationMinutes":10,"questions":[
                  {"prompt":"1 + 1 = ?","options":[{"label":"2","correct":true},{"label":"3","correct":false}]}
                ]}
                """;
        String quizResponseJson = mockMvc.perform(post("/api/v1/instructor/lessons/{lessonId}/quiz", quizLesson.getId())
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createQuizBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode quizData = objectMapper.readTree(quizResponseJson).get("data");
        UUID questionId = UUID.fromString(quizData.get("questions").get(0).get("id").asString());
        UUID rightOptionId = UUID.fromString(quizData.get("questions").get(0).get("options").get(0).get("id").asString());

        // Enroll student -> automatically records COURSE_ENROLLED (idempotent on repeated call)
        mockMvc.perform(post("/api/v1/courses/{courseId}/enrollments", course.getId())
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/courses/{courseId}/enrollments", course.getId())
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk());

        assertThat(countActivities(course.getId(), student.getId(), "COURSE_ENROLLED")).isEqualTo(1);

        // 1. Record VIDEO_WATCHED with JSON metadata -> PostgreSQL jsonb persists cleanly
        mockMvc.perform(post("/api/v1/learning/activities")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "courseId", course.getId(),
                                "sectionId", section.getId(),
                                "lessonId", videoLesson.getId(),
                                "activityType", "VIDEO_WATCHED",
                                "metadata", "{\"duration_seconds\":65,\"position_seconds\":120}"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activityType").value("VIDEO_WATCHED"))
                .andExpect(jsonPath("$.data.activityCategory").value("LESSON"))
                .andExpect(jsonPath("$.data.metadata").isNotEmpty());

        // 2. Record LESSON_VIEWED with blank metadata -> normalized to null without PostgreSQL jsonb error
        mockMvc.perform(post("/api/v1/learning/activities")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "courseId", course.getId(),
                                "lessonId", videoLesson.getId(),
                                "activityType", "LESSON_VIEWED",
                                "metadata", "   "
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activityType").value("LESSON_VIEWED"))
                .andExpect(jsonPath("$.data.metadata").doesNotExist());

        // 3. Invalid JSON metadata returns 400 BAD_REQUEST instead of 500
        mockMvc.perform(post("/api/v1/learning/activities")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "courseId", course.getId(),
                                "lessonId", videoLesson.getId(),
                                "activityType", "VIDEO_WATCHED",
                                "metadata", "{invalid-json"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_ACTIVITY_METADATA"));

        // 4. Creating a lesson note automatically records NOTE_CREATED (LESSON category)
        mockMvc.perform(post("/api/v1/me/notes")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Ghi chú quan trọng",
                                "content", "Lưu ý phần khởi tạo controller",
                                "lessonId", videoLesson.getId(),
                                "videoSecond", 42
                        ))))
                .andExpect(status().isOk());
        assertThat(countActivities(course.getId(), student.getId(), "NOTE_CREATED")).isEqualTo(1);

        // 5. Starting & passing quiz records QUIZ_STARTED, QUIZ_SUBMITTED, LESSON_COMPLETED (not yet COURSE_COMPLETED)
        String sessionJson = mockMvc.perform(post("/api/v1/lessons/{lessonId}/quiz-sessions", quizLesson.getId())
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        UUID sessionId = UUID.fromString(objectMapper.readTree(sessionJson).get("data").get("id").asString());
        assertThat(countActivities(course.getId(), student.getId(), "QUIZ_STARTED")).isEqualTo(1);

        String submitQuizBody = """
                {"sessionId":"%s","activityEvents":[],"answers":[{"questionId":"%s","optionId":"%s"}]}
                """.formatted(sessionId, questionId, rightOptionId);
        mockMvc.perform(post("/api/v1/lessons/{lessonId}/quiz-attempts", quizLesson.getId())
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(submitQuizBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.passed").value(true));
        assertThat(countActivities(course.getId(), student.getId(), "QUIZ_SUBMITTED")).isEqualTo(1);
        assertThat(countActivities(course.getId(), student.getId(), "LESSON_COMPLETED")).isEqualTo(1);
        assertThat(countActivities(course.getId(), student.getId(), "COURSE_COMPLETED")).isEqualTo(0);

        // 6. Asking question & commenting records QUESTION_ASKED & COMMENT_POSTED for student only
        String discussionJson = mockMvc.perform(post("/api/v1/lessons/{lessonId}/discussions", videoLesson.getId())
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Hỏi về phần middleware",
                                "body", "Cho em hỏi thứ tự filter chain?",
                                "videoTimestampSeconds", 75
                        ))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID discussionId = UUID.fromString(objectMapper.readTree(discussionJson).get("data").get("id").asString());

        mockMvc.perform(post("/api/v1/discussions/{discussionId}/comments", discussionId)
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("body", "Em bổ sung thêm ngữ cảnh"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/discussions/{discussionId}/comments", discussionId)
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("body", "Giảng viên trả lời: xem lại phút 01:15"))))
                .andExpect(status().isCreated());

        assertThat(countActivities(course.getId(), student.getId(), "QUESTION_ASKED")).isEqualTo(1);
        assertThat(countActivities(course.getId(), student.getId(), "COMMENT_POSTED")).isEqualTo(1);
        assertThat(countActivities(course.getId(), instructor.getId(), "COMMENT_POSTED")).isEqualTo(0);

        // 7. Completing final lesson records LESSON_COMPLETED, COURSE_COMPLETED, and CERTIFICATE_ISSUED
        mockMvc.perform(post("/api/v1/lessons/{lessonId}/complete", videoLesson.getId())
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completed").value(true));

        assertThat(countActivities(course.getId(), student.getId(), "LESSON_COMPLETED")).isEqualTo(2);
        assertThat(countActivities(course.getId(), student.getId(), "COURSE_COMPLETED")).isEqualTo(1);
        assertThat(countActivities(course.getId(), student.getId(), "CERTIFICATE_ISSUED")).isEqualTo(1);

        // Total events for student = 12 (3 COURSE: enroll+complete+cert; 5 LESSON: video+view+note+2*complete; 2 ASSESSMENT: quiz start+submit; 2 INTERACTION: ask+comment)
        mockMvc.perform(get("/api/v1/learning/activities/me")
                        .param("courseId", course.getId().toString())
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(12)));

        mockMvc.perform(get("/api/v1/learning/activities/me/summary")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalActivities").value(12))
                .andExpect(jsonPath("$.data.countByCategory.COURSE").value(3))
                .andExpect(jsonPath("$.data.countByCategory.LESSON").value(5))
                .andExpect(jsonPath("$.data.countByCategory.ASSESSMENT").value(2))
                .andExpect(jsonPath("$.data.countByCategory.INTERACTION").value(2));

        mockMvc.perform(get("/api/v1/learning/activities/types")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(14)));

        // 8. RBAC checks across Student, Instructor, Other Instructor, and Admin
        mockMvc.perform(get("/api/v1/learning/activities/courses/{courseId}", course.getId())
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/learning/activities/sync")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/learning/activities/sync")
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/learning/activities/courses/{courseId}", course.getId())
                        .header("Authorization", "Bearer " + otherInstructorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/learning/activities/courses/{courseId}", course.getId())
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(12)));

        // Insert a historical enrollment directly in DB without real-time hook, then verify admin /sync backfills it
        jdbcTemplate.update("""
                insert into enrollments (id, student_id, course_id, status, enrolled_at, created_at, updated_at)
                values (?, ?, ?, 'ACTIVE', current_timestamp, current_timestamp, current_timestamp)
                """, UUID.randomUUID(), legacyStudent.getId(), course.getId());

        mockMvc.perform(post("/api/v1/learning/activities/sync")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enrollmentsSynced").value(1));

        Integer totalForCourse = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM learning_activities WHERE course_id = ?",
                Integer.class,
                course.getId()
        );
        assertThat(totalForCourse).isEqualTo(13);
    }

    private int countActivities(UUID courseId, UUID studentId, String activityType) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM learning_activities WHERE course_id = ? AND student_id = ? AND activity_type = ?",
                Integer.class,
                courseId,
                studentId,
                activityType
        );
        return count == null ? 0 : count;
    }

    private User createUser(RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, "Integration test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User("Activity " + roleName, suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private Course createPublishedCourse(User instructor) {
        String suffix = UUID.randomUUID().toString();
        Course course = new Course(
                UUID.randomUUID(),
                instructor.getId(),
                "Khóa học hoạt động",
                "activity-" + suffix,
                null,
                "Mô tả",
                BigDecimal.ZERO,
                null,
                CourseLevel.BEGINNER,
                "vi",
                null
        );
        course.setStatus(CourseStatus.PUBLISHED);
        course.setPublishedAt(Instant.now());
        Course saved = courseRepository.save(course);
        fixtureCourseIds.add(saved.getId());
        return saved;
    }
}
