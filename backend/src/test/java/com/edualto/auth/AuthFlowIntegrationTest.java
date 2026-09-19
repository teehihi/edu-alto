package com.edualto.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

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
class AuthFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from refresh_tokens");
        jdbcTemplate.update("delete from email_otps");
        jdbcTemplate.update("delete from user_roles");
        jdbcTemplate.update("delete from users");
        jdbcTemplate.update("delete from roles");
    }

    @Test
    void registrationCreatesPendingUserWithHashedPassword() throws Exception {
        register("student@example.com", "Password1");

        User user = userRepository.findByEmail("student@example.com").orElseThrow();
        assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
        assertThat(user.getPasswordHash()).isNotEqualTo("Password1");
        assertThat(passwordEncoder.matches("Password1", user.getPasswordHash())).isTrue();
        assertThat(user.getRoles()).extracting(role -> role.getName().name()).containsExactly("STUDENT");
    }

    @Test
    void registrationSupportsStudentAndInstructorRolesAndRejectsAdmin() throws Exception {
        // 1. Explicit STUDENT role
        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Hoc Vien A",
                "email", "student-explicit@example.com",
                "password", "Password1",
                "confirmPassword", "Password1",
                "role", "STUDENT"
        )).andExpect(status().isOk());

        User student = userRepository.findByEmail("student-explicit@example.com").orElseThrow();
        assertThat(student.getRoles()).extracting(role -> role.getName().name()).containsExactly("STUDENT");

        // 2. Explicit INSTRUCTOR role requires expertise
        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Giang Vien B",
                "email", "instructor-noexp@example.com",
                "password", "Password1",
                "confirmPassword", "Password1",
                "role", "INSTRUCTOR"
        )).andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.error.code").value("MISSING_EXPERTISE"));

        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Giang Vien B",
                "email", "instructor@example.com",
                "password", "Password1",
                "confirmPassword", "Password1",
                "role", "INSTRUCTOR",
                "expertise", "Lập trình Java Spring Boot"
        )).andExpect(status().isOk());

        User instructor = userRepository.findByEmail("instructor@example.com").orElseThrow();
        assertThat(instructor.getRoles()).extracting(role -> role.getName().name()).containsExactly("INSTRUCTOR");

        // 3. ADMIN role must be rejected
        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Admin Hacker",
                "email", "admin-attempt@example.com",
                "password", "Password1",
                "confirmPassword", "Password1",
                "role", "ADMIN"
        )).andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.error.code").value("INVALID_ROLE"));

        // 4. Invalid unknown role must be rejected
        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Fake User",
                "email", "fake@example.com",
                "password", "Password1",
                "confirmPassword", "Password1",
                "role", "SUPERUSER"
        )).andExpect(status().isBadRequest());
    }

    @Test
    void instructorCanVerifyAndLoginToViewInstructorRole() throws Exception {
        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Giang Vien Master",
                "email", "teacher@example.com",
                "password", "Password1",
                "confirmPassword", "Password1",
                "role", "INSTRUCTOR",
                "expertise", "Chuyên gia AI và Cloud"
        )).andExpect(status().isOk());

        verifyEmail("teacher@example.com");

        String token = login("teacher@example.com", "Password1").get("data").get("accessToken").asText();

        mockMvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("teacher@example.com"))
                .andExpect(jsonPath("$.data.roles[0]").value("INSTRUCTOR"));
    }

    @Test
    void registrationValidationAndDuplicateEmailAreRejected() throws Exception {
        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Nguyen Van A",
                "email", "not-an-email",
                "password", "Password1",
                "confirmPassword", "Password1"
        )).andExpect(status().isBadRequest());

        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Nguyen Van A",
                "email", "weak@example.com",
                "password", "password",
                "confirmPassword", "password"
        )).andExpect(status().isBadRequest());

        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Nguyen Van A",
                "email", "mismatch@example.com",
                "password", "Password1",
                "confirmPassword", "Password2"
        ))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("PASSWORD_CONFIRMATION_MISMATCH"));

        register("duplicate@example.com", "Password1");
        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Nguyen Van B",
                "email", "duplicate@example.com",
                "password", "Password1",
                "confirmPassword", "Password1"
        ))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"));
    }

    @Test
    void emailVerificationActivatesAccountAndProtectsInvalidExpiredAndAttemptLimitedOtp() throws Exception {
        register("verify@example.com", "Password1");

        postJson("/api/v1/auth/verify-email", Map.of("email", "verify@example.com", "otp", "000000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_OTP"));
        postJson("/api/v1/auth/verify-email", Map.of("email", "verify@example.com", "otp", "000000"))
                .andExpect(status().isBadRequest());
        postJson("/api/v1/auth/verify-email", Map.of("email", "verify@example.com", "otp", "000000"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("OTP_ATTEMPT_LIMIT_EXCEEDED"));

        postJson("/api/v1/auth/resend-verification", Map.of("email", "verify@example.com"))
                .andExpect(status().isOk());
        postJson("/api/v1/auth/verify-email", Map.of("email", "verify@example.com", "otp", "123456"))
                .andExpect(status().isOk());

        User verified = userRepository.findByEmail("verify@example.com").orElseThrow();
        assertThat(verified.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(verified.getEmailVerifiedAt()).isNotNull();

        register("expired@example.com", "Password1");
        jdbcTemplate.update("update email_otps set expires_at = ?", Timestamp.from(Instant.now().minusSeconds(60)));
        postJson("/api/v1/auth/verify-email", Map.of("email", "expired@example.com", "otp", "123456"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("OTP_EXPIRED"));
    }

    @Test
    void loginRequiresVerifiedAccountAndAccessTokenAuthenticatesCurrentUser() throws Exception {
        register("login@example.com", "Password1");

        postJson("/api/v1/auth/login", Map.of("email", "login@example.com", "password", "Password1"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCOUNT_NOT_VERIFIED"));

        verifyEmail("login@example.com");

        postJson("/api/v1/auth/login", Map.of("email", "login@example.com", "password", "wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));

        String accessToken = login("login@example.com", "Password1").get("data").get("accessToken").asText();
        mockMvc.perform(get("/api/v1/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("login@example.com"))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$").value(not(containsString("Password1"))));

        mockMvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokenRotatesAndLogoutRevokesRefreshToken() throws Exception {
        registerAndVerify("refresh@example.com", "Password1");
        JsonNode login = login("refresh@example.com", "Password1");
        String refreshToken = login.get("data").get("refreshToken").asText();

        MvcResult refreshResult = postJson("/api/v1/auth/refresh", Map.of("refreshToken", refreshToken))
                .andExpect(status().isOk())
                .andReturn();
        String nextRefreshToken = objectMapper.readTree(refreshResult.getResponse().getContentAsString())
                .get("data").get("refreshToken").asText();

        postJson("/api/v1/auth/refresh", Map.of("refreshToken", refreshToken))
                .andExpect(status().isUnauthorized());

        postJson("/api/v1/auth/logout", Map.of("refreshToken", nextRefreshToken))
                .andExpect(status().isOk());
        postJson("/api/v1/auth/refresh", Map.of("refreshToken", nextRefreshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokenIsRejectedWhenAccountIsNoLongerActive() throws Exception {
        registerAndVerify("disabled-refresh@example.com", "Password1");
        JsonNode login = login("disabled-refresh@example.com", "Password1");
        String refreshToken = login.get("data").get("refreshToken").asText();

        jdbcTemplate.update("update users set status = 'DISABLED' where email = ?", "disabled-refresh@example.com");

        postJson("/api/v1/auth/refresh", Map.of("refreshToken", refreshToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void passwordResetRequiresVerifiedOtpAndPreventsReuse() throws Exception {
        registerAndVerify("reset@example.com", "OldPassword1");

        postJson("/api/v1/auth/forgot-password", Map.of("email", "missing@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email của bạn."));

        postJson("/api/v1/auth/forgot-password", Map.of("email", "reset@example.com"))
                .andExpect(status().isOk());

        postJson("/api/v1/auth/reset-password", Map.of(
                "email", "reset@example.com",
                "otp", "123456",
                "newPassword", "NewPassword1",
                "confirmPassword", "NewPassword1"
        ))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("RESET_OTP_NOT_VERIFIED"));

        postJson("/api/v1/auth/verify-reset-otp", Map.of("email", "reset@example.com", "otp", "000000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_OTP"));
        postJson("/api/v1/auth/verify-reset-otp", Map.of("email", "reset@example.com", "otp", "123456"))
                .andExpect(status().isOk());

        postJson("/api/v1/auth/reset-password", Map.of(
                "email", "reset@example.com",
                "otp", "123456",
                "newPassword", "NewPassword1",
                "confirmPassword", "NewPassword1"
        ))
                .andExpect(status().isOk());

        postJson("/api/v1/auth/login", Map.of("email", "reset@example.com", "password", "OldPassword1"))
                .andExpect(status().isUnauthorized());
        login("reset@example.com", "NewPassword1");

        postJson("/api/v1/auth/reset-password", Map.of(
                "email", "reset@example.com",
                "otp", "123456",
                "newPassword", "AnotherPassword1",
                "confirmPassword", "AnotherPassword1"
        ))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetPasswordCountsInvalidOtpAfterVerification() throws Exception {
        registerAndVerify("reset-attempt@example.com", "OldPassword1");

        postJson("/api/v1/auth/forgot-password", Map.of("email", "reset-attempt@example.com"))
                .andExpect(status().isOk());
        postJson("/api/v1/auth/verify-reset-otp", Map.of("email", "reset-attempt@example.com", "otp", "123456"))
                .andExpect(status().isOk());

        postJson("/api/v1/auth/reset-password", Map.of(
                "email", "reset-attempt@example.com",
                "otp", "000000",
                "newPassword", "NewPassword1",
                "confirmPassword", "NewPassword1"
        ))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_OTP"));
        postJson("/api/v1/auth/reset-password", Map.of(
                "email", "reset-attempt@example.com",
                "otp", "000000",
                "newPassword", "NewPassword1",
                "confirmPassword", "NewPassword1"
        ))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("OTP_ATTEMPT_LIMIT_EXCEEDED"));
    }

    private void registerAndVerify(String email, String password) throws Exception {
        register(email, password);
        verifyEmail(email);
    }

    private void register(String email, String password) throws Exception {
        postJson("/api/v1/auth/register", Map.of(
                "fullName", "Nguyen Van A",
                "email", email,
                "password", password,
                "confirmPassword", password
        )).andExpect(status().isOk());
    }

    private void verifyEmail(String email) throws Exception {
        postJson("/api/v1/auth/verify-email", Map.of("email", email, "otp", "123456"))
                .andExpect(status().isOk());
    }

    private JsonNode login(String email, String password) throws Exception {
        MvcResult result = postJson("/api/v1/auth/login", Map.of("email", email, "password", password))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private org.springframework.test.web.servlet.ResultActions postJson(String path, Object body) throws Exception {
        return mockMvc.perform(post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }
}
