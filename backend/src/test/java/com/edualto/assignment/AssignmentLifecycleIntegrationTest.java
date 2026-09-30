package com.edualto.assignment;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.repository.CourseRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AssignmentLifecycleIntegrationTest extends AbstractIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JwtTokenService jwtTokenService;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private CourseRepository courses;
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
    void studentCannotChangeSubmissionAfterInstructorHasGradedIt() throws Exception {
        User instructor = createUser(RoleName.INSTRUCTOR);
        User student = createUser(RoleName.STUDENT);
        Course course = createCourse(instructor);
        jdbc.update("insert into enrollments (id, student_id, course_id, status, enrolled_at) values (?, ?, ?, 'ACTIVE', ?)",
                UUID.randomUUID(), student.getId(), course.getId(), Timestamp.from(Instant.now()));

        String createdAssignment = mockMvc.perform(post("/api/v1/instructor/courses/{courseId}/assignments", course.getId())
                        .header("Authorization", bearer(instructor)).contentType("application/json")
                        .content("""
                                {"title":"Bài luyện tập", "description":"Nộp phần giải", "maxScore":10}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        UUID assignmentId = UUID.fromString(objectMapper.readTree(createdAssignment).get("data").get("id").asString());

        mockMvc.perform(post("/api/v1/instructor/assignments/{assignmentId}/publish", assignmentId)
                        .header("Authorization", bearer(instructor)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/assignments/{assignmentId}/submissions", assignmentId)
                        .header("Authorization", bearer(student)).contentType("application/json")
                        .content("{\"responseText\":\"Bài làm ban đầu\"}"))
                .andExpect(status().isOk());

        String submissionJson = mockMvc.perform(get("/api/v1/instructor/assignments/{assignmentId}/submissions", assignmentId)
                        .header("Authorization", bearer(instructor)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode submission = objectMapper.readTree(submissionJson).get("data").get(0);
        UUID submissionId = UUID.fromString(submission.get("id").asString());

        mockMvc.perform(put("/api/v1/instructor/assignments/{assignmentId}/submissions/{submissionId}/grade",
                        assignmentId, submissionId)
                        .header("Authorization", bearer(instructor)).contentType("application/json")
                        .content("{\"score\":8,\"feedback\":\"Tốt\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/assignments/{assignmentId}/submissions/me", assignmentId)
                        .header("Authorization", bearer(student)).contentType("application/json")
                        .content("{\"responseText\":\"Bài làm thay thế\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("SUBMISSION_ALREADY_GRADED"));

        assertThat(jdbc.queryForObject("select response_text from assignment_submissions where id = ?", String.class, submissionId))
                .isEqualTo("Bài làm ban đầu");
        assertThat(jdbc.queryForObject("select score from assignment_submissions where id = ?", BigDecimal.class, submissionId))
                .isEqualByComparingTo("8.00");
        assertThat(jdbc.queryForObject("select feedback from assignment_submissions where id = ?", String.class, submissionId))
                .isEqualTo("Tốt");
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
        Course course = new Course(UUID.randomUUID(), instructor.getId(), "Khóa học bài tập", "assignment-" + suffix,
                null, "Mô tả khóa học", BigDecimal.ZERO, null, CourseLevel.ALL_LEVELS, "vi", null);
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
