package com.edualto.profile;

import com.edualto.auth.domain.EmailOtp;
import com.edualto.auth.domain.OtpPurpose;
import com.edualto.auth.repository.EmailOtpRepository;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class AvatarUploadIntegrationTest {

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
    private com.edualto.course.repository.CourseRepository courseRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @MockitoBean
    private StorageService storageService;

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
    void authenticatedUserCanRequestUploadUrlWithValidMimeAndSize() throws Exception {
        String token = registerAndLogin("Tran Avatar User", "avatar.test@example.com", "Password123");
        User user = userRepository.findByEmail("avatar.test@example.com").orElseThrow();

        when(storageService.generatePresignedUploadUrl(anyString(), eq("image/webp"), eq(245678L), any(Duration.class)))
                .thenAnswer(inv -> new PresignedUploadUrl("https://r2.test/upload-presigned-url", inv.getArgument(0), Instant.now().plusSeconds(900)));

        postJsonWithToken("/api/v1/me/profile/avatar/upload-url", Map.of(
                "contentType", "image/webp",
                "contentLength", 245678
        ), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.uploadUrl").value("https://r2.test/upload-presigned-url"))
                .andExpect(jsonPath("$.data.objectKey").value(startsWith("avatars/" + user.getId() + "/")))
                .andExpect(jsonPath("$.data.objectKey").value(endsWith(".webp")))
                .andExpect(jsonPath("$.data.expiresAt").exists());
    }

    @Test
    void requestUploadUrlRejectsUnsupportedMimeTypeOrOver5Mb() throws Exception {
        String token = registerAndLogin("Reject User", "reject.test@example.com", "Password123");

        // Unsupported MIME type (e.g. image/gif or application/pdf)
        postJsonWithToken("/api/v1/me/profile/avatar/upload-url", Map.of(
                "contentType", "image/gif",
                "contentLength", 1024
        ), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_CONTENT_TYPE"));

        // Over 5MB (5MB = 5242880 bytes)
        postJsonWithToken("/api/v1/me/profile/avatar/upload-url", Map.of(
                "contentType", "image/png",
                "contentLength", 6 * 1024 * 1024
        ), token)
                .andExpect(status().isBadRequest());
    }

    @Test
    void avatarCompletionRejectsObjectKeyNotOwnedByUser() throws Exception {
        String token = registerAndLogin("Owner User", "owner.test@example.com", "Password123");
        UUID anotherUserId = UUID.randomUUID();

        postJsonWithToken("/api/v1/me/profile/avatar/complete", Map.of(
                "objectKey", "avatars/" + anotherUserId + "/avatar.png"
        ), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_OBJECT_KEY"));
    }

    @Test
    void avatarCompletionRejectsIfObjectDoesNotExistInStorage() throws Exception {
        String token = registerAndLogin("Missing Object User", "missing.test@example.com", "Password123");
        User user = userRepository.findByEmail("missing.test@example.com").orElseThrow();
        String key = "avatars/" + user.getId() + "/avatar.png";

        when(storageService.objectExists(key)).thenReturn(false);

        postJsonWithToken("/api/v1/me/profile/avatar/complete", Map.of(
                "objectKey", key
        ), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("AVATAR_NOT_FOUND"));
    }

    @Test
    void avatarCompletionRejectsIfMetadataIsInvalidOnStorage() throws Exception {
        String token = registerAndLogin("Invalid Metadata User", "metadata.test@example.com", "Password123");
        User user = userRepository.findByEmail("metadata.test@example.com").orElseThrow();
        String key = "avatars/" + user.getId() + "/avatar.jpg";

        when(storageService.objectExists(key)).thenReturn(true);
        // Metadata has oversized content
        when(storageService.getObjectMetadata(key))
                .thenReturn(new ObjectMetadata("image/jpeg", 10 * 1024 * 1024L, "etag-123"));

        postJsonWithToken("/api/v1/me/profile/avatar/complete", Map.of(
                "objectKey", key
        ), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_AVATAR_METADATA"));
    }

    @Test
    void avatarCompletionSucceedsAndPersistsAvatarKeyAndDeletesOldAvatarWhenReplacing() throws Exception {
        String token = registerAndLogin("Full Flow User", "fullflow.test@example.com", "Password123");
        User user = userRepository.findByEmail("fullflow.test@example.com").orElseThrow();

        String oldKey = "avatars/" + user.getId() + "/avatar.jpg";
        String newKey = "avatars/" + user.getId() + "/avatar.webp";

        // Pre-create profile with old avatar
        Profile existingProfile = new Profile(user.getId(), "Developer", "Bio", oldKey);
        profileRepository.save(existingProfile);

        when(storageService.objectExists(newKey)).thenReturn(true);
        when(storageService.getObjectMetadata(newKey))
                .thenReturn(new ObjectMetadata("image/webp", 150000L, "etag-new"));
        when(storageService.getPublicUrl(newKey))
                .thenReturn("https://r2.test/edualto-media/" + newKey);

        // Complete new avatar
        postJsonWithToken("/api/v1/me/profile/avatar/complete", Map.of(
                "objectKey", newKey
        ), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarKey").value(newKey))
                .andExpect(jsonPath("$.data.avatarUrl").value("https://r2.test/edualto-media/" + newKey));

        // Verify database state
        Profile updatedProfile = profileRepository.findById(user.getId()).orElseThrow();
        assertThat(updatedProfile.getAvatarKey()).isEqualTo(newKey);

        // Verify old avatar was deleted from storage
        verify(storageService).deleteObject(oldKey);

        // Verify GET /api/v1/me/profile returns updated avatar URL
        mockMvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarKey").value(newKey))
                .andExpect(jsonPath("$.data.avatarUrl").value("https://r2.test/edualto-media/" + newKey));
    }
}
