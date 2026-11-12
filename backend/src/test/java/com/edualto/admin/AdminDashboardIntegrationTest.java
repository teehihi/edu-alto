package com.edualto.admin;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminDashboardIntegrationTest extends AbstractIntegrationTest {

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
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private StorageService storageService;

    private final List<UUID> fixtureUserIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("delete from refresh_tokens where user_id = ?", userId);
        }
        userRepository.deleteAllById(fixtureUserIds);
        fixtureUserIds.clear();
    }

    @Test
    void studentCannotAccessAdminEndpoints() throws Exception {
        User student = createUser("Admin Test Student", "Password123", RoleName.STUDENT);
        String studentToken = jwtTokenService.createAccessToken(student);

        mockMvc.perform(get("/api/v1/admin/dashboard/summary")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/roles")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanManageUsersUpdateRolesAndDisableRevokesRefreshToken() throws Exception {
        User admin = createUser("System Admin", "Password123", RoleName.ADMIN);
        String adminToken = jwtTokenService.createAccessToken(admin);

        String targetEmail = "created-user-" + UUID.randomUUID() + "@edualto.test";
        String createResponse = mockMvc.perform(post("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "fullName", "Created Learner",
                                "email", targetEmail,
                                "password", "InitialPass123",
                                "roles", List.of("STUDENT")
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(targetEmail))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdRoot = objectMapper.readTree(createResponse);
        UUID targetUserId = UUID.fromString(createdRoot.get("data").get("id").asText());
        fixtureUserIds.add(targetUserId);

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("keyword", targetEmail))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].email", hasItem(targetEmail)));

        mockMvc.perform(patch("/api/v1/admin/users/{userId}/roles", targetUserId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "roles", List.of("STUDENT", "INSTRUCTOR")
                        ))))
                .andExpect(status().isOk());

        User updatedUser = userRepository.findById(targetUserId).orElseThrow();
        assertThat(updatedUser.getRoles())
                .extracting(role -> role.getName().name())
                .containsExactlyInAnyOrder("STUDENT", "INSTRUCTOR");

        String refreshToken = loginAndExtractRefreshToken(targetEmail, "InitialPass123");
        assertThat(refreshTokenRepository.findByUserAndRevokedAtIsNull(updatedUser)).isNotEmpty();

        mockMvc.perform(patch("/api/v1/admin/users/{userId}/status", targetUserId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "DISABLED"))))
                .andExpect(status().isOk());

        User disabledUser = userRepository.findById(targetUserId).orElseThrow();
        assertThat(disabledUser.getStatus()).isEqualTo(UserStatus.DISABLED);
        assertThat(refreshTokenRepository.findByUserAndRevokedAtIsNull(disabledUser)).isEmpty();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("edualto.refresh", refreshToken)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminResetPasswordRevokesRefreshTokenAndAllowsLoginWithNewPassword() throws Exception {
        User admin = createUser("Password Reset Admin", "Password123", RoleName.ADMIN);
        String adminToken = jwtTokenService.createAccessToken(admin);

        User targetUser = createUser("Target Reset User", "OldPassword123", RoleName.STUDENT);
        String oldRefreshToken = loginAndExtractRefreshToken(targetUser.getEmail(), "OldPassword123");
        assertThat(refreshTokenRepository.findByUserAndRevokedAtIsNull(targetUser)).isNotEmpty();

        mockMvc.perform(post("/api/v1/admin/users/{userId}/reset-password", targetUser.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("newPassword", "NewPassword123"))))
                .andExpect(status().isOk());

        assertThat(refreshTokenRepository.findByUserAndRevokedAtIsNull(targetUser)).isEmpty();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("edualto.refresh", oldRefreshToken)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", targetUser.getEmail(),
                                "password", "OldPassword123"
                        ))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", targetUser.getEmail(),
                                "password", "NewPassword123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    private User createUser(String fullName, String rawPassword, RoleName... roleNames) {
        String email = "admin-it-" + UUID.randomUUID() + "@edualto.test";
        User user = new User(fullName, email, passwordEncoder.encode(rawPassword));
        for (RoleName roleName : roleNames) {
            Role role = roleRepository.findByName(roleName)
                    .orElseGet(() -> roleRepository.save(new Role(roleName, roleName.name() + " test role")));
            user.addRole(role);
        }
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }

    private String loginAndExtractRefreshToken(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", password
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        String setCookie = result.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).isNotNull();
        for (String part : setCookie.split(";")) {
            String trimmed = part.trim();
            if (trimmed.startsWith("edualto.refresh=")) {
                return trimmed.substring("edualto.refresh=".length());
            }
        }
        throw new IllegalStateException("Refresh token cookie not found in Set-Cookie header");
    }
}
