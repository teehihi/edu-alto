package com.edualto.course;

import com.edualto.auth.domain.EmailOtp;
import com.edualto.auth.domain.OtpPurpose;
import com.edualto.auth.repository.EmailOtpRepository;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import com.edualto.profile.repository.InstructorProfileRepository;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.profile.repository.StudentProfileRepository;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:edualto;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "edualto.auth.jwt.secret=test-jwt-secret-with-at-least-32-characters",
        "edualto.auth.otp.fixed-code=123456",
        "edualto.auth.otp.resend-cooldown-seconds=0",
        "edualto.auth.otp.max-attempts=2"
})
@AutoConfigureMockMvc
class CourseStructureIntegrationTest {

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

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @MockitoBean
    private StorageService storageService;

    @BeforeEach
    void setUp() {
        lessonRepository.deleteAll();
        sectionRepository.deleteAll();
        courseRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        emailOtpRepository.deleteAll();
        studentProfileRepository.deleteAll();
        instructorProfileRepository.deleteAll();
        profileRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String registerAndLogin(String email, String role, String fullName) throws Exception {
        Map<String, Object> registerRequest = new HashMap<>();
        registerRequest.put("email", email);
        registerRequest.put("password", "Pass123456");
        registerRequest.put("confirmPassword", "Pass123456");
        registerRequest.put("fullName", fullName);
        registerRequest.put("role", role);
        if ("INSTRUCTOR".equals(role)) {
            registerRequest.put("expertise", "Công nghệ thông tin");
            registerRequest.put("bio", "Giảng viên lâu năm");
        }

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        Map<String, String> verifyRequest = Map.of("email", email, "otp", "123456");
        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyRequest)))
                .andExpect(status().isOk());

        Map<String, String> loginRequest = Map.of("email", email, "password", "Pass123456");
        ResultActions loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk());

        JsonNode jsonNode = objectMapper.readTree(loginResult.andReturn().getResponse().getContentAsString());
        return jsonNode.get("data").get("accessToken").asText();
    }

    private Course createTestCourse(UUID instructorId, String title, String slug) {
        Course course = new Course(
                null,
                instructorId,
                title,
                slug,
                "Tagline",
                "Description",
                BigDecimal.valueOf(299000),
                BigDecimal.valueOf(499000),
                CourseLevel.ALL_LEVELS,
                "vi",
                null
        );
        return courseRepository.save(course);
    }

    @Test
    @DisplayName("End-to-End: Instructor tạo section, tạo lesson, reorder và load course structure")
    void fullCourseStructureFlow_success() throws Exception {
        String token = registerAndLogin("teacher@edualto.com", "INSTRUCTOR", "Giảng viên A");
        User user = userRepository.findByEmail("teacher@edualto.com").orElseThrow();
        Course course = createTestCourse(user.getId(), "Khóa học AI 2026", "khoa-hoc-ai-2026");

        // 1. Tạo Section 1
        Map<String, String> sec1Req = Map.of("title", "Chương 1: Tổng quan AI", "description", "Mô tả chương 1");
        ResultActions sec1Res = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId() + "/sections")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sec1Req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Chương 1: Tổng quan AI"))
                .andExpect(jsonPath("$.data.position").value(1));

        String sec1Id = objectMapper.readTree(sec1Res.andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        // 2. Tạo Section 2
        Map<String, String> sec2Req = Map.of("title", "Chương 2: Prompt Engineering", "description", "Mô tả chương 2");
        ResultActions sec2Res = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId() + "/sections")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sec2Req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.position").value(2));

        String sec2Id = objectMapper.readTree(sec2Res.andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        // 3. Tạo Lesson 1 trong Section 1
        Map<String, Object> les1Req = new HashMap<>();
        les1Req.put("title", "Bài 1: Giới thiệu AI");
        les1Req.put("content", "Nội dung bài học 1");
        les1Req.put("lessonType", "TEXT");
        les1Req.put("durationSeconds", 420);
        les1Req.put("isPreview", true);

        ResultActions les1Res = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId() + "/sections/" + sec1Id + "/lessons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(les1Req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Bài 1: Giới thiệu AI"))
                .andExpect(jsonPath("$.data.position").value(1))
                .andExpect(jsonPath("$.data.isPreview").value(true));

        String les1Id = objectMapper.readTree(les1Res.andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        // 4. Tạo Lesson 2 trong Section 1
        Map<String, Object> les2Req = new HashMap<>();
        les2Req.put("title", "Bài 2: Các mô hình LLM");
        les2Req.put("lessonType", "VIDEO");
        les2Req.put("durationSeconds", 900);
        les2Req.put("isPreview", false);

        ResultActions les2Res = mockMvc.perform(post("/api/v1/instructor/courses/" + course.getId() + "/sections/" + sec1Id + "/lessons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(les2Req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.position").value(2));

        String les2Id = objectMapper.readTree(les2Res.andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        // 5. Reorder Lessons trong Section 1 (Đảo vị trí Bài 2 lên trước Bài 1)
        Map<String, Object> reorderLessonsReq = Map.of("items", List.of(
                Map.of("id", les2Id, "position", 1),
                Map.of("id", les1Id, "position", 2)
        ));

        mockMvc.perform(put("/api/v1/instructor/courses/" + course.getId() + "/sections/" + sec1Id + "/lessons/reorder")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reorderLessonsReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].id").value(les2Id))
                .andExpect(jsonPath("$.data[0].position").value(1));

        // 6. Reorder Sections (Đảo Chương 2 lên trước Chương 1)
        Map<String, Object> reorderSecReq = Map.of("items", List.of(
                Map.of("id", sec2Id, "position", 1),
                Map.of("id", sec1Id, "position", 2)
        ));

        mockMvc.perform(put("/api/v1/instructor/courses/" + course.getId() + "/sections/reorder")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reorderSecReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].id").value(sec2Id))
                .andExpect(jsonPath("$.data[0].position").value(1));

        // 7. Load toàn bộ Course Structure
        mockMvc.perform(get("/api/v1/instructor/courses/" + course.getId() + "/structure")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSections").value(2))
                .andExpect(jsonPath("$.data.totalLessons").value(2))
                .andExpect(jsonPath("$.data.totalDurationSeconds").value(1320))
                .andExpect(jsonPath("$.data.sections", hasSize(2)))
                .andExpect(jsonPath("$.data.sections[0].id").value(sec2Id))
                .andExpect(jsonPath("$.data.sections[1].id").value(sec1Id))
                .andExpect(jsonPath("$.data.sections[1].lessons", hasSize(2)));

        // 8. Delete Section 2
        mockMvc.perform(delete("/api/v1/instructor/courses/" + course.getId() + "/sections/" + sec2Id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Kiểm tra sau khi xóa Section 2: chỉ còn 1 Section và position tự động normalize về 1
        mockMvc.perform(get("/api/v1/instructor/courses/" + course.getId() + "/sections")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(sec1Id))
                .andExpect(jsonPath("$.data[0].position").value(1));
    }

    @Test
    @DisplayName("Bảo mật: Giảng viên B không thể thao tác trên Section/Lesson của Giảng viên A (403)")
    void security_otherInstructorCannotModifySections() throws Exception {
        String tokenA = registerAndLogin("teachera@edualto.com", "INSTRUCTOR", "Giảng viên A");
        String tokenB = registerAndLogin("teacherb@edualto.com", "INSTRUCTOR", "Giảng viên B");

        User userA = userRepository.findByEmail("teachera@edualto.com").orElseThrow();
        Course courseA = createTestCourse(userA.getId(), "Khóa học của A", "khoa-hoc-cua-a");

        // Giảng viên B cố gắng tạo Section trên Course của A -> Bị chặn 403
        Map<String, String> secReq = Map.of("title", "Hack Section", "description", "Mô tả");
        mockMvc.perform(post("/api/v1/instructor/courses/" + courseA.getId() + "/sections")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Bảo mật: Học viên (STUDENT) không có quyền truy cập endpoint quản lý chương trình học (403)")
    void security_studentCannotAccessInstructorEndpoints() throws Exception {
        String studentToken = registerAndLogin("student@edualto.com", "STUDENT", "Học viên");
        UUID dummyCourseId = UUID.randomUUID();

        Map<String, String> secReq = Map.of("title", "Section", "description", "Desc");
        mockMvc.perform(post("/api/v1/instructor/courses/" + dummyCourseId + "/sections")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(secReq)))
                .andExpect(status().isForbidden());
    }
}
