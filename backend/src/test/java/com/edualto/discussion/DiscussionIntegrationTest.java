package com.edualto.discussion;

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
import com.edualto.storage.service.StorageService;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DiscussionIntegrationTest extends AbstractIntegrationTest {

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
    private EnrollmentService enrollmentService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private StorageService storageService;

    private final List<UUID> fixtureUserIds = new ArrayList<>();
    private final List<UUID> fixtureCourseIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID courseId : fixtureCourseIds) {
            jdbcTemplate.update("delete from discussion_comments where discussion_id in (select id from discussions where course_id = ?)", courseId);
            jdbcTemplate.update("delete from discussions where course_id = ?", courseId);
            jdbcTemplate.update("delete from learning_activities where course_id = ?", courseId);
            jdbcTemplate.update("delete from enrollments where course_id = ?", courseId);
        }
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("delete from notifications where recipient_id = ?", userId);
        }
        courseRepository.deleteAllById(fixtureCourseIds);
        userRepository.deleteAllById(fixtureUserIds);
        fixtureCourseIds.clear();
        fixtureUserIds.clear();
    }

    @Test
    void unenrolledStudentCannotListOrCreateLessonDiscussions() throws Exception {
        User instructor = createUser("Discussion Instructor", RoleName.INSTRUCTOR);
        User unenrolledStudent = createUser("Unenrolled Student", RoleName.STUDENT);
        Course course = createPublishedCourse(instructor);
        Section section = createSection(course);
        Lesson lesson = createPublishedLesson(section);

        String unenrolledToken = jwtTokenService.createAccessToken(unenrolledStudent);

        mockMvc.perform(get("/api/v1/lessons/{lessonId}/discussions", lesson.getId())
                        .header("Authorization", "Bearer " + unenrolledToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));

        mockMvc.perform(post("/api/v1/lessons/{lessonId}/discussions", lesson.getId())
                        .header("Authorization", "Bearer " + unenrolledToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Thắc mắc ngoài khóa học",
                                "body", "Nội dung câu hỏi",
                                "videoTimestampSeconds", 30
                        ))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));
    }

    @Test
    void enrolledStudentCreatesDiscussionInstructorRepliesResolvesAndOtherStudentCannotDelete() throws Exception {
        User instructor = createUser("Course Instructor", RoleName.INSTRUCTOR);
        User studentA = createUser("Enrolled Student A", RoleName.STUDENT);
        User studentB = createUser("Enrolled Student B", RoleName.STUDENT);
        Course course = createPublishedCourse(instructor);
        Section section = createSection(course);
        Lesson lesson = createPublishedLesson(section);

        enrollmentService.enroll(studentA.getId(), course.getId());
        enrollmentService.enroll(studentB.getId(), course.getId());

        String studentAToken = jwtTokenService.createAccessToken(studentA);
        String studentBToken = jwtTokenService.createAccessToken(studentB);
        String instructorToken = jwtTokenService.createAccessToken(instructor);

        String createBody = mockMvc.perform(post("/api/v1/lessons/{lessonId}/discussions", lesson.getId())
                        .header("Authorization", "Bearer " + studentAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Cách cấu hình Spring Security JWT",
                                "body", "Ở phút thứ 2 giảng viên dùng bộ lọc nào vậy ạ?",
                                "videoTimestampSeconds", 125
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("Cách cấu hình Spring Security JWT"))
                .andExpect(jsonPath("$.data.videoTimestampSeconds").value(125))
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdRoot = objectMapper.readTree(createBody);
        UUID discussionId = UUID.fromString(createdRoot.get("data").get("id").asText());

        mockMvc.perform(get("/api/v1/lessons/{lessonId}/discussions", lesson.getId())
                        .header("Authorization", "Bearer " + studentAToken)
                        .param("hasTimestamp", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(discussionId.toString()));

        mockMvc.perform(get("/api/v1/lessons/{lessonId}/discussions", lesson.getId())
                        .header("Authorization", "Bearer " + studentAToken)
                        .param("search", "JWT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(discussionId.toString()));

        mockMvc.perform(get("/api/v1/lessons/{lessonId}/discussions", lesson.getId())
                        .header("Authorization", "Bearer " + studentAToken)
                        .param("search", "khongtontai"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        mockMvc.perform(get("/api/v1/courses/{courseId}/discussions", course.getId())
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(discussionId.toString()));

        mockMvc.perform(post("/api/v1/discussions/{discussionId}/comments", discussionId)
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "body", "Mình dùng JwtAuthenticationFilter kế thừa OncePerRequestFilter nhé."
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.isCourseInstructor").value(true));

        mockMvc.perform(put("/api/v1/discussions/{discussionId}/status", discussionId)
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "RESOLVED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESOLVED"));

        mockMvc.perform(get("/api/v1/discussions/{discussionId}", discussionId)
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                .andExpect(jsonPath("$.data.commentCount").value(1))
                .andExpect(jsonPath("$.data.comments", hasSize(1)));

        mockMvc.perform(delete("/api/v1/discussions/{discussionId}", discussionId)
                        .header("Authorization", "Bearer " + studentBToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    private User createUser(String fullName, RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, roleName.name() + " test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User(fullName, "discussion-it-" + suffix + "@edualto.test", "not-a-real-password-hash");
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
                "Khóa học Thảo luận",
                "discussion-course-" + suffix,
                null,
                "Mô tả khóa học",
                BigDecimal.ZERO,
                null,
                CourseLevel.ALL_LEVELS,
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

    private Lesson createPublishedLesson(Section section) {
        return lessonRepository.save(new Lesson(
                UUID.randomUUID(),
                section.getId(),
                "Bài 1",
                "lesson-1-" + UUID.randomUUID(),
                null,
                "Nội dung bài học",
                LessonType.VIDEO,
                1,
                300,
                false,
                null,
                LessonStatus.PUBLISHED
        ));
    }
}
