package com.edualto.profile;

import com.edualto.auth.domain.EmailOtp;
import com.edualto.auth.domain.OtpPurpose;
import com.edualto.auth.repository.EmailOtpRepository;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.course.repository.CourseRepository;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.storage.infrastructure.ImageWebpProcessor;
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
import org.springframework.core.env.Environment;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import com.edualto.AbstractIntegrationTest;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AvatarUploadIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private EmailOtpRepository emailOtpRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private Environment environment;

    @MockitoBean
    private StorageService storageService;

    @MockitoBean
    private ImageWebpProcessor imageWebpProcessor;

    @BeforeEach
    void setUp() {
        courseRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        emailOtpRepository.deleteAll();
        profileRepository.deleteAll();
        userRepository.deleteAll();
    }

    private ResultActions postJson(String uri, Object body) throws Exception {
        return mockMvc.perform(post(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions postJsonWithToken(String uri, Object body, String token) throws Exception {
        return mockMvc.perform(post(uri)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private String registerAndLogin(String fullName, String email, String password) throws Exception {
        Map<String, Object> req = new HashMap<>();
        req.put("fullName", fullName);
        req.put("email", email);
        req.put("password", password);
        req.put("confirmPassword", password);
        req.put("role", "STUDENT");

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
    void avatarPresignedCompletionIsDisabled() throws Exception {
        String token = registerAndLogin("Rollback Avatar", "rollback-avatar@example.com", "Password1");

        postJsonWithToken("/api/v1/me/profile/avatar/complete", Map.of(
                "objectKey", "avatars/old/avatar.png"
        ), token)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.error.code").value("DIRECT_IMAGE_UPLOAD_DISABLED"));
    }

    @Test
    void multipartAvatarSupportsFiveMbAndRejectsOversizedFiles() throws Exception {
        String token = registerAndLogin("Multipart User", "multipart@example.com", "Password1");
        byte[] data = new byte[5 * 1024 * 1024];
        byte[] webpData = new byte[]{'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};
        when(storageService.getPublicUrl(anyString())).thenReturn("https://r2.test/avatar.webp");
        when(imageWebpProcessor.normalize(any(byte[].class), eq("image/png"), eq(512)))
                .thenReturn(webpData);

        assertThat(DataSize.parse(environment.getRequiredProperty("spring.servlet.multipart.max-file-size")))
                .isEqualTo(DataSize.ofMegabytes(5));
        assertThat(DataSize.parse(environment.getRequiredProperty("spring.servlet.multipart.max-request-size")))
                .isEqualTo(DataSize.ofMegabytes(6));
        mockMvc.perform(multipart("/api/v1/me/profile/avatar")
                .file(new MockMultipartFile("file", "avatar.png", "image/png", data))
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value("https://r2.test/avatar.webp"));
        verify(storageService).putObject(anyString(), eq("image/webp"), eq(webpData));

        mockMvc.perform(multipart("/api/v1/me/profile/avatar")
                .file(new MockMultipartFile("file", "oversized.png", "image/png", new byte[data.length + 1]))
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_FILE_SIZE"));
    }

    @Test
    void unauthenticatedUserCannotRequestAvatarUploadUrlOrComplete() throws Exception {
        mockMvc.perform(post("/api/v1/me/profile/avatar/upload-url")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contentType\":\"image/webp\",\"contentLength\":1024}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/me/profile/avatar/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"objectKey\":\"avatars/some-id/avatar.webp\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedUserCannotRequestDirectAvatarUploadUrl() throws Exception {
        String token = registerAndLogin("Tran Avatar User", "avatar.test@example.com", "Password123");
        postJsonWithToken("/api/v1/me/profile/avatar/upload-url", Map.of(
                "contentType", "image/webp",
                "contentLength", 245678
        ), token)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.error.code").value("DIRECT_IMAGE_UPLOAD_DISABLED"));

        postJsonWithToken("/api/v1/me/profile/avatar/complete", Map.of(
                "objectKey", "avatars/old/avatar.png"
        ), token)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.error.code").value("DIRECT_IMAGE_UPLOAD_DISABLED"));
    }

    @Test
    void directAvatarUploadUrlIsDisabledForAllImageTypesAndSizes() throws Exception {
        String token = registerAndLogin("Reject User", "reject.test@example.com", "Password123");

        // Unsupported MIME type (e.g. image/gif or application/pdf)
        postJsonWithToken("/api/v1/me/profile/avatar/upload-url", Map.of(
                "contentType", "image/gif",
                "contentLength", 1024
        ), token)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.error.code").value("DIRECT_IMAGE_UPLOAD_DISABLED"));

        // Over 5MB (5MB = 5242880 bytes)
        postJsonWithToken("/api/v1/me/profile/avatar/upload-url", Map.of(
                "contentType", "image/png",
                "contentLength", 6 * 1024 * 1024
        ), token)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.error.code").value("DIRECT_IMAGE_UPLOAD_DISABLED"));
    }

}
