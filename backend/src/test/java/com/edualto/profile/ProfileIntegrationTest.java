package com.edualto.profile;

import com.edualto.auth.domain.EmailOtp;
import com.edualto.auth.domain.OtpPurpose;
import com.edualto.auth.repository.EmailOtpRepository;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.course.repository.CourseRepository;
import com.edualto.profile.repository.InstructorProfileRepository;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.profile.repository.StudentProfileRepository;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import com.edualto.AbstractIntegrationTest;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProfileIntegrationTest extends AbstractIntegrationTest {

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
    private CourseRepository courseRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

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

    private ResultActions putJson(String uri, Object body, String token) throws Exception {
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
    void studentRegistrationCreatesStudentProfileAndCanUpdateProfile() throws Exception {
        String token = registerAndLogin(
                "Nguyen Van Hoc Vien",
                "student.profile@example.com",
                "Password1",
                "STUDENT",
                "Học lập trình Spring Boot và Next.js",
                null,
                null
        );

        // 1. Get profile
        mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Nguyen Van Hoc Vien"))
                .andExpect(jsonPath("$.data.email").value("student.profile@example.com"))
                .andExpect(jsonPath("$.data.studentProfile.learningGoal").value("Học lập trình Spring Boot và Next.js"))
                .andExpect(jsonPath("$.data.instructorProfile").doesNotExist());

        // 2. Update profile
        putJson("/api/v1/me/profile", Map.of(
                "fullName", "Nguyen Van Hoc Vien Pro",
                "headline", "Kỹ sư phần mềm tương lai",
                "bio", "Đang theo học các khóa Fullstack tại EduAlto",
                "occupation", "Sinh viên năm 3",
                "educationLevel", "Đại học",
                "interests", "Java, React, Tailwind CSS",
                "linkedinUrl", "https://linkedin.com/in/hocvien"
        ), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Nguyen Van Hoc Vien Pro"))
                .andExpect(jsonPath("$.data.headline").value("Kỹ sư phần mềm tương lai"))
                .andExpect(jsonPath("$.data.bio").value("Đang theo học các khóa Fullstack tại EduAlto"))
                .andExpect(jsonPath("$.data.studentProfile.occupation").value("Sinh viên năm 3"))
                .andExpect(jsonPath("$.data.studentProfile.educationLevel").value("Đại học"))
                .andExpect(jsonPath("$.data.studentProfile.interests").value("Java, React, Tailwind CSS"))
                .andExpect(jsonPath("$.data.linkedinUrl").value("https://linkedin.com/in/hocvien"));

        // Verify users.full_name is the single source of truth and updated
        User updated = userRepository.findByEmail("student.profile@example.com").orElseThrow();
        assertThat(updated.getFullName()).isEqualTo("Nguyen Van Hoc Vien Pro");
    }

    @Test
    void instructorRegistrationCreatesInstructorProfileAndCanUpdateInstructorFields() throws Exception {
        String token = registerAndLogin(
                "Tran Thi Giang Vien",
                "instructor.profile@example.com",
                "Password1",
                "INSTRUCTOR",
                null,
                "Chuyên gia An ninh mạng",
                "10 năm kinh nghiệm nghiên cứu bảo mật thông tin."
        );

        // 1. Get profile
        mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Tran Thi Giang Vien"))
                .andExpect(jsonPath("$.data.email").value("instructor.profile@example.com"))
                .andExpect(jsonPath("$.data.bio").value("10 năm kinh nghiệm nghiên cứu bảo mật thông tin."))
                .andExpect(jsonPath("$.data.instructorProfile.expertise").value("Chuyên gia An ninh mạng"))
                .andExpect(jsonPath("$.data.instructorProfile.verifiedAt").doesNotExist());

        // 2. Update instructor profile fields
        putJson("/api/v1/me/profile", Map.of(
                "headline", "Lead Security Engineer & EduAlto Instructor",
                "experienceYears", 8,
                "teachingExperience", "Đã đào tạo hơn 5.000 học viên về Pentest và AppSec",
                "qualificationSummary", "Thạc sĩ Khoa học Máy tính, CISSP, CEH",
                "specialties", "Web Security, Cryptography, Cloud Security",
                "websiteUrl", "https://tranthigiangvien.dev"
        ), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("Lead Security Engineer & EduAlto Instructor"))
                .andExpect(jsonPath("$.data.instructorProfile.experienceYears").value(8))
                .andExpect(jsonPath("$.data.instructorProfile.teachingExperience").value("Đã đào tạo hơn 5.000 học viên về Pentest và AppSec"))
                .andExpect(jsonPath("$.data.instructorProfile.qualificationSummary").value("Thạc sĩ Khoa học Máy tính, CISSP, CEH"))
                .andExpect(jsonPath("$.data.instructorProfile.specialties").value("Web Security, Cryptography, Cloud Security"))
                .andExpect(jsonPath("$.data.websiteUrl").value("https://tranthigiangvien.dev"));
    }

    @Test
    void lazyProfileCreationWhenProfileRecordDoesNotExist() throws Exception {
        String token = registerAndLogin(
                "Lazy User",
                "lazy.profile@example.com",
                "Password123",
                "STUDENT",
                null,
                null,
                null
        );

        // Delete any pre-created profile record to test lazy handling
        User user = userRepository.findByEmail("lazy.profile@example.com").orElseThrow();
        profileRepository.deleteById(user.getId());

        mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Lazy User"))
                .andExpect(jsonPath("$.data.headline").doesNotExist());

        // Updating profile lazily creates Profile entity
        putJson("/api/v1/me/profile", Map.of("headline", "New Headline"), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.headline").value("New Headline"));

        assertThat(profileRepository.findById(user.getId())).isPresent();
    }

    @Test
    void updateProfileValidatesFieldConstraints() throws Exception {
        String token = registerAndLogin(
                "Validation User",
                "validation.profile@example.com",
                "Password123",
                "STUDENT",
                null,
                null,
                null
        );

        // Headline exceeding 255 chars
        String longHeadline = "A".repeat(256);
        putJson("/api/v1/me/profile", Map.of("headline", longHeadline), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void anonymousAccessToProfileEndpointIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/me/profile"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/v1/me/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
