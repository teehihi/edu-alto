package com.edualto.review;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.repository.CourseRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CourseReviewIntegrationTest extends AbstractIntegrationTest {

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
            jdbcTemplate.update("delete from course_reviews where course_id = ?", courseId);
            jdbcTemplate.update("delete from enrollments where course_id = ?", courseId);
        }
        courseRepository.deleteAllById(fixtureCourseIds);
        userRepository.deleteAllById(fixtureUserIds);
        fixtureCourseIds.clear();
        fixtureUserIds.clear();
    }

    @Test
    void unenrolledStudentCannotSubmitCourseReview() throws Exception {
        User instructor = createUser("Review Instructor", RoleName.INSTRUCTOR);
        User unenrolledStudent = createUser("Unenrolled Reviewer", RoleName.STUDENT);
        Course course = createPublishedCourse(instructor);

        String token = jwtTokenService.createAccessToken(unenrolledStudent);

        mockMvc.perform(put("/api/v1/me/courses/{courseId}/review", course.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rating", 5,
                                "comment", "Chưa ghi danh nhưng gửi đánh giá"
                        ))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ENROLLMENT_REQUIRED"));
    }

    @Test
    void enrolledStudentUpsertsReviewAndInstructorHidesAndReplies() throws Exception {
        User instructor = createUser("Course Owner Instructor", RoleName.INSTRUCTOR);
        User student = createUser("Enrolled Reviewer", RoleName.STUDENT);
        Course course = createPublishedCourse(instructor);
        enrollmentService.enroll(student.getId(), course.getId());

        String studentToken = jwtTokenService.createAccessToken(student);
        String instructorToken = jwtTokenService.createAccessToken(instructor);

        String createResponse = mockMvc.perform(put("/api/v1/me/courses/{courseId}/review", course.getId())
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rating", 4,
                                "comment", "Khóa học khá hay"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").value(4))
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdRoot = objectMapper.readTree(createResponse);
        UUID reviewId = UUID.fromString(createdRoot.get("data").get("id").asText());

        mockMvc.perform(put("/api/v1/me/courses/{courseId}/review", course.getId())
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "rating", 5,
                                "comment", "Nội dung rất chi tiết và dễ hiểu"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(reviewId.toString()))
                .andExpect(jsonPath("$.data.rating").value(5))
                .andExpect(jsonPath("$.data.comment").value("Nội dung rất chi tiết và dễ hiểu"));

        mockMvc.perform(get("/api/v1/courses/{courseId}/reviews", course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(reviewId.toString()))
                .andExpect(jsonPath("$.data[0].rating").value(5));

        mockMvc.perform(get("/api/v1/courses/{courseId}/reviews/summary", course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviewCount").value(1))
                .andExpect(jsonPath("$.data.averageRating").value(5.0));

        mockMvc.perform(put("/api/v1/instructor/courses/{courseId}/reviews/{reviewId}/visibility", course.getId(), reviewId)
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("published", false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("HIDDEN"));

        mockMvc.perform(get("/api/v1/courses/{courseId}/reviews", course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        mockMvc.perform(get("/api/v1/courses/{courseId}/reviews/summary", course.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviewCount").value(0));

        mockMvc.perform(put("/api/v1/instructor/courses/{courseId}/reviews/{reviewId}/reply", course.getId(), reviewId)
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "reply", "Cảm ơn bạn đã phản hồi tích cực!"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.instructorReply").value("Cảm ơn bạn đã phản hồi tích cực!"))
                .andExpect(jsonPath("$.data.instructorRepliedAt").isNotEmpty());
    }

    private User createUser(String fullName, RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, roleName.name() + " test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User(fullName, "review-it-" + suffix + "@edualto.test", "not-a-real-password-hash");
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
                "Khóa học Đánh giá",
                "review-course-" + suffix,
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
}
