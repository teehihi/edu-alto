package com.edualto.quiz;

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
import com.edualto.enrollment.service.EnrollmentService;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class QuizIntegrationTest extends AbstractIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtTokenService jwtTokenService;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private CourseRepository courses;
    @Autowired private SectionRepository sections;
    @Autowired private LessonRepository lessons;
    @Autowired private EnrollmentService enrollments;
    @Autowired private JdbcTemplate jdbc;

    private final List<UUID> fixtureUserIds = new ArrayList<>();
    private final List<UUID> fixtureCourseIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        fixtureCourseIds.forEach(courseId -> jdbc.update("delete from enrollments where course_id = ?", courseId));
        courses.deleteAllById(fixtureCourseIds);
        users.deleteAllById(fixtureUserIds);
        fixtureCourseIds.clear();
        fixtureUserIds.clear();
    }

    @Test
    void instructorCreatesPrivateAnswerKeyAndEnrolledStudentCanSubmitScoredAttempt() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        User student = createUser(RoleName.STUDENT);
        User otherStudent = createUser(RoleName.STUDENT);
        Course course = createCourse(instructor);
        Section section = sections.save(new Section(UUID.randomUUID(), course.getId(), "Chương 1", null, 1));
        Lesson lesson = lessons.save(new Lesson(UUID.randomUUID(), section.getId(), "Kiểm tra kiến thức", null,
                null, null, LessonType.QUIZ, 1, 300, false, null, LessonStatus.PUBLISHED));
        enrollments.enroll(student.getId(), course.getId());

        String createBody = """
                {"passingScore":50,"questions":[
                  {"prompt":"2 + 2 bằng bao nhiêu?","options":[{"label":"3","correct":false},{"label":"4","correct":true}]},
                  {"prompt":"Thủ đô Việt Nam?","options":[{"label":"Hà Nội","correct":true},{"label":"Đà Nẵng","correct":false}]}
                ]}
                """;
        String created = mockMvc.perform(post("/api/v1/instructor/lessons/{lessonId}/quiz", lesson.getId())
                        .header("Authorization", bearer(instructor)).contentType("application/json").content(createBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode quizData = objectMapper.readTree(created).get("data");
        UUID quizId = UUID.fromString(quizData.get("id").asString());
        UUID firstQuestionId = UUID.fromString(quizData.get("questions").get(0).get("id").asString());
        UUID secondQuestionId = UUID.fromString(quizData.get("questions").get(1).get("id").asString());
        UUID wrongOptionId = UUID.fromString(quizData.get("questions").get(0).get("options").get(0).get("id").asString());
        UUID rightOptionId = UUID.fromString(quizData.get("questions").get(1).get("options").get(0).get("id").asString());

        mockMvc.perform(get("/api/v1/lessons/{lessonId}/quiz", lesson.getId())
                        .header("Authorization", bearer(student)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.questions", hasSize(2)))
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).doesNotContain("correct"));

        mockMvc.perform(get("/api/v1/lessons/{lessonId}/quiz", lesson.getId())
                        .header("Authorization", bearer(otherStudent)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));

        String submitBody = """
                {"answers":[
                  {"questionId":"%s","optionId":"%s"},
                  {"questionId":"%s","optionId":"%s"}
                ]}
                """.formatted(firstQuestionId, wrongOptionId, secondQuestionId, rightOptionId);
        mockMvc.perform(post("/api/v1/lessons/{lessonId}/quiz-attempts", lesson.getId())
                        .header("Authorization", bearer(student)).contentType("application/json").content(submitBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quizId").value(quizId.toString()))
                .andExpect(jsonPath("$.data.score").value(50.00))
                .andExpect(jsonPath("$.data.correctAnswers").value(1))
                .andExpect(jsonPath("$.data.totalQuestions").value(2))
                .andExpect(jsonPath("$.data.passed").value(true));

        assertThat(jdbc.queryForObject("select count(*) from quiz_attempts where quiz_id = ? and student_id = ?",
                Integer.class, quizId, student.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from quiz_attempt_answers", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select count(*) from learning_progress where lesson_id = ?", Integer.class,
                lesson.getId())).isEqualTo(1);
    }

    @Test
    void rejectsInvalidAnswerSetsAndOnlyCourseOwnerMayCreateQuiz() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        User otherInstructor = createUser(RoleName.INSTRUCTOR);
        User student = createUser(RoleName.STUDENT);
        Course course = createCourse(instructor);
        Section section = sections.save(new Section(UUID.randomUUID(), course.getId(), "Chương 1", null, 1));
        Lesson lesson = lessons.save(new Lesson(UUID.randomUUID(), section.getId(), "Kiểm tra kiến thức", null,
                null, null, LessonType.QUIZ, 1, 300, false, null, LessonStatus.PUBLISHED));
        String validQuiz = """
                {"passingScore":70,"questions":[
                  {"prompt":"Câu hỏi 1?","options":[{"label":"Đúng","correct":true},{"label":"Sai","correct":false}]},
                  {"prompt":"Câu hỏi 2?","options":[{"label":"Có","correct":true},{"label":"Không","correct":false}]}
                ]}
                """;
        mockMvc.perform(post("/api/v1/instructor/lessons/{lessonId}/quiz", lesson.getId())
                        .header("Authorization", bearer(otherInstructor)).contentType("application/json").content(validQuiz))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/instructor/lessons/{lessonId}/quiz", lesson.getId())
                        .header("Authorization", bearer(instructor)).contentType("application/json")
                        .content("{\"passingScore\":70,\"questions\":[{\"prompt\":\"Câu hỏi?\",\"options\":[{\"label\":\"A\",\"correct\":true},{\"label\":\"B\",\"correct\":true}]}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("QUIZ_REQUIRES_ONE_CORRECT_OPTION"));
        mockMvc.perform(post("/api/v1/instructor/lessons/{lessonId}/quiz", lesson.getId())
                        .header("Authorization", bearer(instructor)).contentType("application/json").content(validQuiz))
                .andExpect(status().isOk());
        enrollments.enroll(student.getId(), course.getId());
        String quizJson = mockMvc.perform(get("/api/v1/lessons/{lessonId}/quiz", lesson.getId())
                        .header("Authorization", bearer(student)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode question = objectMapper.readTree(quizJson).get("data").get("questions").get(0);
        String duplicateAnswers = """
                {"answers":[{"questionId":"%s","optionId":"%s"},{"questionId":"%s","optionId":"%s"}]}
                """.formatted(question.get("id").asString(), question.get("options").get(0).get("id").asString(),
                question.get("id").asString(), question.get("options").get(1).get("id").asString());
        mockMvc.perform(post("/api/v1/lessons/{lessonId}/quiz-attempts", lesson.getId())
                        .header("Authorization", bearer(student)).contentType("application/json").content(duplicateAnswers))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("QUIZ_ANSWER_DUPLICATE"));
    }

    private User createUser(RoleName roleName) {
        Role role = roles.findByName(roleName).orElseGet(() -> roles.save(new Role(roleName, "Integration test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User("Integration " + roleName, suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        user.activate();
        User saved = users.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private Course createCourse(User instructor) {
        String suffix = UUID.randomUUID().toString();
        Course course = new Course(UUID.randomUUID(), instructor.getId(), "Khóa học kiểm tra", "quiz-" + suffix,
                null, "Mô tả", BigDecimal.ZERO, null, CourseLevel.ALL_LEVELS, "vi", null);
        course.setStatus(CourseStatus.PUBLISHED);
        course.setPublishedAt(Instant.now());
        Course saved = courses.save(course);
        fixtureCourseIds.add(saved.getId());
        return saved;
    }

    private String bearer(User user) {
        return "Bearer " + jwtTokenService.createAccessToken(user);
    }
}
