package com.edualto.course;

import com.edualto.auth.domain.EmailOtp;
import com.edualto.auth.domain.OtpPurpose;
import com.edualto.auth.repository.EmailOtpRepository;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.repository.CourseRepository;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.repository.InstructorProfileRepository;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.profile.repository.StudentProfileRepository;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import com.edualto.AbstractIntegrationTest;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CourseIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private InstructorProfileRepository instructorProfileRepository;

    @Autowired
    private EmailOtpRepository emailOtpRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private CourseRepository courseRepository;

    @MockitoBean
    private StorageService storageService;

    @BeforeEach
    void setUp() {
        courseRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        emailOtpRepository.deleteAll();
        studentProfileRepository.deleteAll();
        instructorProfileRepository.deleteAll();
        profileRepository.deleteAll();
        userRepository.deleteAll();
    }

    private ResultActions postJson(String uri, Object body) throws Exception {
        return mockMvc.perform(post(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions postJsonAuth(String uri, Object body, String token) throws Exception {
        return mockMvc.perform(post(uri)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions putJsonAuth(String uri, Object body, String token) throws Exception {
        return mockMvc.perform(put(uri)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private String registerAndLogin(String fullName, String email, String password, String role, String learningGoal, String expertise, String bio) throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("fullName", fullName);
        req.put("email", email);
        req.put("password", password);
        req.put("confirmPassword", password);
        req.put("role", role);
        if (learningGoal != null) req.put("learningGoal", learningGoal);
        if (expertise != null) req.put("expertise", expertise);
        if (bio != null) req.put("bio", bio);

        postJson("/api/v1/auth/register", req).andExpect(status().isOk());

        User user = userRepository.findByEmail(email).orElseThrow();
        EmailOtp otp = emailOtpRepository.findAll().stream()
                .filter(item -> item.getUser().getId().equals(user.getId()) && item.getPurpose() == OtpPurpose.EMAIL_VERIFICATION)
                .findFirst()
                .orElseThrow();

        postJson("/api/v1/auth/verify-email", Map.of("email", email, "otp", "123456"))
                .andExpect(status().isOk());

        String response = postJson("/api/v1/auth/login", Map.of("email", email, "password", password))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode root = objectMapper.readTree(response);
        return root.get("data").get("accessToken").asText();
    }

    @Test
    void instructorCourseFullLifecycleAndPublicCatalogIntegration() throws Exception {
        // 1. Register Instructor
        String instructorToken = registerAndLogin(
                "Thầy Giáo Ba",
                "instructor.lifecycle@edualto.com",
                "Password123",
                "INSTRUCTOR",
                null,
                "Chuyên gia Lập trình Java Spring Boot",
                "10 năm kinh nghiệm phát triển phần mềm doanh nghiệp."
        );

        // 2. Create Course as Instructor (DRAFT)
        Map<String, Object> createReq = Map.of(
                "title", "Khóa Học Spring Boot 3 Chuyên Sâu",
                "tagline", "Xây dựng hệ thống backend hiệu năng cao",
                "description", "Chi tiết về Spring Security, JPA, Flyway, R2 Storage và PostgreSQL.",
                "price", 799000,
                "originalPrice", 1499000,
                "level", "ADVANCED",
                "language", "vi"
        );

        String createRes = postJsonAuth("/api/v1/instructor/courses", createReq, instructorToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Khóa Học Spring Boot 3 Chuyên Sâu"))
                .andExpect(jsonPath("$.data.slug").value("khoa-hoc-spring-boot-3-chuyen-sau"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.price").value(799000))
                .andExpect(jsonPath("$.data.originalPrice").value(1499000))
                .andExpect(jsonPath("$.data.level").value("ADVANCED"))
                .andReturn().getResponse().getContentAsString();

        JsonNode createdNode = objectMapper.readTree(createRes).get("data");
        String courseId = createdNode.get("id").asText();
        String slug = createdNode.get("slug").asText();

        // 3. Draft course must NOT be visible in public catalog or public slug endpoint
        mockMvc.perform(get("/api/v1/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        mockMvc.perform(get("/api/v1/courses/" + slug))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("COURSE_NOT_FOUND"));

        // 4. Update Course Details & custom slug
        Map<String, Object> updateReq = Map.of(
                "title", "Khóa Học Spring Boot 3 Chuyên Sâu Cập Nhật",
                "slug", "spring-boot-3-chuyen-sau-pro",
                "tagline", "Xây dựng hệ thống Microservices & Monolith",
                "description", "Cập nhật nội dung toàn diện năm 2026.",
                "price", 899000,
                "originalPrice", 1699000,
                "level", "ADVANCED",
                "language", "vi"
        );

        putJsonAuth("/api/v1/instructor/courses/" + courseId, updateReq, instructorToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Khóa Học Spring Boot 3 Chuyên Sâu Cập Nhật"))
                .andExpect(jsonPath("$.data.slug").value("spring-boot-3-chuyen-sau-pro"))
                .andExpect(jsonPath("$.data.price").value(899000));

        // 5. Publish Course
        postJsonAuth("/api/v1/instructor/courses/" + courseId + "/publish", Map.of(), instructorToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.publishedAt").isNotEmpty());

        // 6. Public Catalog now lists the published course
        mockMvc.perform(get("/api/v1/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].slug").value("spring-boot-3-chuyen-sau-pro"))
                .andExpect(jsonPath("$.data[0].instructor.fullName").value("Thầy Giáo Ba"))
                .andExpect(jsonPath("$.meta.totalElements").value(1));

        // 7. Public Course Detail by slug returns published course details
        mockMvc.perform(get("/api/v1/courses/spring-boot-3-chuyen-sau-pro"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Khóa Học Spring Boot 3 Chuyên Sâu Cập Nhật"))
                .andExpect(jsonPath("$.data.description").value("Cập nhật nội dung toàn diện năm 2026."))
                .andExpect(jsonPath("$.data.instructor.fullName").value("Thầy Giáo Ba"));

        // 8. Public Filter tests
        // Match keyword
        mockMvc.perform(get("/api/v1/courses?keyword=Microservices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        // Unmatched keyword
        mockMvc.perform(get("/api/v1/courses?keyword=NonExistentSubject"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        // Filter by level
        mockMvc.perform(get("/api/v1/courses?level=ADVANCED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        mockMvc.perform(get("/api/v1/courses?level=BEGINNER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        // 9. Archive Course
        postJsonAuth("/api/v1/instructor/courses/" + courseId + "/archive", Map.of(), instructorToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ARCHIVED"));

        // 10. Archived course is removed from public catalog
        mockMvc.perform(get("/api/v1/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        mockMvc.perform(get("/api/v1/courses/spring-boot-3-chuyen-sau-pro"))
                .andExpect(status().isNotFound());
    }

    @Test
    void studentCannotManageCoursesAndInstructorCannotEditOthersCourses() throws Exception {
        // Register Student
        String studentToken = registerAndLogin(
                "Nguyen Van Hoc Vien",
                "student.test@edualto.com",
                "Password123",
                "STUDENT",
                "Học lập trình",
                null,
                null
        );

        // Register Instructor 1
        String instructor1Token = registerAndLogin(
                "Giảng Viên 1",
                "instructor1@edualto.com",
                "Password123",
                "INSTRUCTOR",
                null,
                "Chuyên gia AI",
                "Bio"
        );

        // Register Instructor 2
        String instructor2Token = registerAndLogin(
                "Giảng Viên 2",
                "instructor2@edualto.com",
                "Password123",
                "INSTRUCTOR",
                null,
                "Chuyên gia DevOps",
                "Bio"
        );

        // Student tries to create course -> 403 Forbidden
        postJsonAuth("/api/v1/instructor/courses", Map.of(
                "title", "Khóa học của học viên",
                "description", "Mô tả",
                "price", 0
        ), studentToken).andExpect(status().isForbidden());

        // Instructor 1 creates course
        String createRes = postJsonAuth("/api/v1/instructor/courses", Map.of(
                "title", "Khóa Học Machine Learning",
                "description", "Mô tả ML",
                "price", 500000
        ), instructor1Token).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        String courseId = objectMapper.readTree(createRes).get("data").get("id").asText();

        // Instructor 2 tries to update Instructor 1's course -> 403 Forbidden
        putJsonAuth("/api/v1/instructor/courses/" + courseId, Map.of(
                "title", "Khóa Học Hack",
                "description", "Mô tả",
                "price", 100000
        ), instructor2Token).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED_COURSE_ACCESS"));

        // Instructor 2 tries to publish Instructor 1's course -> 403 Forbidden
        postJsonAuth("/api/v1/instructor/courses/" + courseId + "/publish", Map.of(), instructor2Token)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED_COURSE_ACCESS"));
    }

    @Test
    void instructorThumbnailUploadUrlIntegration() throws Exception {
        String instructorToken = registerAndLogin(
                "Giảng Viên Thumbnail",
                "instructor.thumbnail@edualto.com",
                "Password123",
                "INSTRUCTOR",
                null,
                "Chuyên gia Design",
                "Bio"
        );

        when(storageService.generatePresignedUploadUrl(any(), eq("image/png"), eq(1024L), any(Duration.class)))
                .thenReturn(new PresignedUploadUrl("https://r2.edualto.com/upload-thumbnail", "courses/thumbnails/dummy.png", Instant.now().plus(Duration.ofMinutes(15))));

        postJsonAuth("/api/v1/instructor/courses/thumbnail-upload-url", Map.of(
                "contentType", "image/png",
                "contentLength", 1024
        ), instructorToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uploadUrl").value("https://r2.edualto.com/upload-thumbnail"))
                .andExpect(jsonPath("$.data.objectKey").isNotEmpty());
    }
}
