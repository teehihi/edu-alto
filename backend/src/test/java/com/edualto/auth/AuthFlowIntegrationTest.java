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
import com.edualto.auth.dto.ResetPasswordRequest;
import com.edualto.auth.service.AuthService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.edualto.AbstractIntegrationTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthFlowIntegrationTest extends AbstractIntegrationTest {

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

    @Autowired
    private AuthService authService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from courses");
        jdbcTemplate.update("delete from profiles");
        jdbcTemplate.update("delete from student_profiles");
        jdbcTemplate.update("delete from instructor_profiles");
        jdbcTemplate.update("delete from refresh_tokens");
        jdbcTemplate.update("delete from email_otps");
        jdbcTemplate.update("delete from user_roles");
        jdbcTemplate.update("delete from users");
        jdbcTemplate.update("delete from roles");
    }

    @Test
    void unverifiedLoginDoesNotReplaceOtpOrResetFailedAttempts() throws Exception {
        String email = "pending-login@example.com";
        register(email, "Password1");
        postJson("/api/v1/auth/verify-email", Map.of("email", email, "otp", "000000"))
                .andExpect(status().isBadRequest());
        for (int index = 0; index < 2; index++) {
            postJson("/api/v1/auth/login", Map.of("email", email, "password", "Password1"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error.code").value("ACCOUNT_NOT_VERIFIED"));
        }
        assertThat(jdbcTemplate.queryForObject("select count(*) from email_otps", Long.class)).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("select attempts from email_otps", Integer.class)).isEqualTo(1);
        verifyEmail(email);
    }

    @Test
    void emailVerificationCannotReactivateLockedAccount() throws Exception {
        register("locked-verify@example.com", "Password1");
        jdbcTemplate.update("update users set status = 'LOCKED' where email = ?", "locked-verify@example.com");

        postJson("/api/v1/auth/verify-email", Map.of("email", "locked-verify@example.com", "otp", "123456"))
                .andExpect(status().isForbidden());
        postJson("/api/v1/auth/resend-verification", Map.of("email", "locked-verify@example.com"))
                .andExpect(status().isForbidden());
        assertThat(userRepository.findByEmail("locked-verify@example.com").orElseThrow().getStatus())
                .isEqualTo(UserStatus.LOCKED);
    }

    @Test
    void concurrentRefreshRequestsCanOnlyRotateTokenOnce() throws Exception {
        registerAndVerify("concurrent-refresh@example.com", "Password1");
        String refreshToken = extractRefreshToken(loginResult("concurrent-refresh@example.com", "Password1"));

        List<Integer> statuses = runConcurrently(6, () -> mockMvc.perform(post("/api/v1/auth/refresh")
                .cookie(new Cookie("edualto.refresh", refreshToken)))
                .andReturn().getResponse().getStatus());

        assertThat(statuses).containsOnly(200, 401);
        assertThat(statuses.stream().filter(status -> status == 200).count()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("select count(*) from refresh_tokens where revoked_at is null", Long.class))
                .isEqualTo(1);
    }

    @Test
    void concurrentInvalidOtpRequestsCannotBypassAttemptLimit() throws Exception {
        register("concurrent-otp@example.com", "Password1");

        List<Integer> statuses = runConcurrently(6, () -> postJson("/api/v1/auth/verify-email",
                Map.of("email", "concurrent-otp@example.com", "otp", "000000"))
                .andReturn().getResponse().getStatus());

        assertThat(statuses).containsOnly(400, 429);
        assertThat(statuses.stream().filter(status -> status == 400).count()).isEqualTo(2);
        postJson("/api/v1/auth/verify-email", Map.of("email", "concurrent-otp@example.com", "otp", "123456"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void passwordResetRollsBackOtpConsumptionWithPasswordChange() throws Exception {
        String email = "atomic-reset@example.com";
        registerAndVerify(email, "OldPassword1");
        postJson("/api/v1/auth/forgot-password", Map.of("email", email)).andExpect(status().isOk());
        postJson("/api/v1/auth/verify-reset-otp", Map.of("email", email, "otp", "123456"))
                .andExpect(status().isOk());
        ResetPasswordRequest request = new ResetPasswordRequest(email, "123456", "NewPassword1", "NewPassword1");

        assertThatThrownBy(() -> new TransactionTemplate(transactionManager).executeWithoutResult(transaction -> {
            authService.resetPassword(request);
            throw new IllegalStateException("Simulated persistence failure");
        })).isInstanceOf(IllegalStateException.class);

        login(email, "OldPassword1");
        postJson("/api/v1/auth/reset-password", request).andExpect(status().isOk());
        login(email, "NewPassword1");
    }

    @Test
    void unicodePasswordOverBcryptByteLimitReturnsClientError() throws Exception {
        String password = "â".repeat(36) + "A1";
        postJson("/api/v1/auth/register", Map.of("fullName", "Nguyen Van A", "email", "unicode@example.com",
                "password", password, "confirmPassword", password))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("PASSWORD_TOO_LONG"));

        postJson("/api/v1/auth/login", Map.of("email", "unicode@example.com", "password", password))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRevocationPersistsForInactiveAccount() throws Exception {
        registerAndVerify("inactive-refresh@example.com", "Password1");
        String refreshToken = extractRefreshToken(loginResult("inactive-refresh@example.com", "Password1"));
        jdbcTemplate.update("update users set status = 'PENDING_VERIFICATION' where email = ?", "inactive-refresh@example.com");

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("edualto.refresh", refreshToken)))
                .andExpect(status().isUnauthorized());
        assertThat(jdbcTemplate.queryForObject("select count(*) from refresh_tokens where revoked_at is null", Long.class))
                .isZero();
    }

    private <T> List<T> runConcurrently(int count, Callable<T> request) throws Exception {
        CountDownLatch ready = new CountDownLatch(count);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(count)) {
            List<Future<T>> futures = new ArrayList<>();
            for (int index = 0; index < count; index++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Concurrent start timed out");
                    return request.call();
                }));
            }
            if (!ready.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Requests did not become ready");
            start.countDown();
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) results.add(future.get(20, TimeUnit.SECONDS));
            return results;
        }
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
        MvcResult loginResult = loginResult("refresh@example.com", "Password1");
        String refreshToken = extractRefreshToken(loginResult);

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("edualto.refresh", refreshToken)))
                .andExpect(status().isOk())
                .andReturn();
        String nextRefreshToken = extractRefreshToken(refreshResult);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("edualto.refresh", refreshToken)))
                .andExpect(status().isUnauthorized());

        MvcResult logoutResult = mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new Cookie("edualto.refresh", nextRefreshToken)))
                .andExpect(status().isOk())
                .andReturn();
        String clearedCookie = logoutResult.getResponse().getHeader("Set-Cookie");
        assertThat(clearedCookie).contains("Max-Age=0");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("edualto.refresh", nextRefreshToken)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokenIsRejectedWhenAccountIsNoLongerActive() throws Exception {
        registerAndVerify("disabled-refresh@example.com", "Password1");
        MvcResult loginResult = loginResult("disabled-refresh@example.com", "Password1");
        String refreshToken = extractRefreshToken(loginResult);

        jdbcTemplate.update("update users set status = 'DISABLED' where email = ?", "disabled-refresh@example.com");

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new Cookie("edualto.refresh", refreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    void refreshAndLogoutRejectUntrustedOriginsBeforeChangingRefreshToken() throws Exception {
        registerAndVerify("cors-refresh@example.com", "Password1");

        for (String origin : List.of("https://attacker.vercel.app", "https://untrusted.example")) {
            String refreshToken = extractRefreshToken(loginResult("cors-refresh@example.com", "Password1"));

            MvcResult rejectedRefresh = mockMvc.perform(post("/api/v1/auth/refresh")
                            .header("Origin", origin)
                            .cookie(new Cookie("edualto.refresh", refreshToken)))
                    .andExpect(status().isForbidden())
                    .andReturn();
            assertThat(rejectedRefresh.getResponse().getHeader("Set-Cookie")).isNull();

            MvcResult acceptedRefresh = mockMvc.perform(post("/api/v1/auth/refresh")
                            .cookie(new Cookie("edualto.refresh", refreshToken)))
                    .andExpect(status().isOk())
                    .andReturn();
            String rotatedRefreshToken = extractRefreshToken(acceptedRefresh);

            MvcResult rejectedLogout = mockMvc.perform(post("/api/v1/auth/logout")
                            .header("Origin", origin)
                            .cookie(new Cookie("edualto.refresh", rotatedRefreshToken)))
                    .andExpect(status().isForbidden())
                    .andReturn();
            assertThat(rejectedLogout.getResponse().getHeader("Set-Cookie")).isNull();

            mockMvc.perform(post("/api/v1/auth/refresh")
                            .cookie(new Cookie("edualto.refresh", rotatedRefreshToken)))
                    .andExpect(status().isOk());
        }
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
                .andExpect(status().isBadRequest());
        postJson("/api/v1/auth/reset-password", Map.of(
                "email", "reset-attempt@example.com",
                "otp", "000000",
                "newPassword", "NewPassword1",
                "confirmPassword", "NewPassword1"
        ))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("OTP_ATTEMPT_LIMIT_EXCEEDED"));

        postJson("/api/v1/auth/reset-password", Map.of(
                "email", "reset-attempt@example.com", "otp", "123456",
                "newPassword", "NewPassword1", "confirmPassword", "NewPassword1"
        )).andExpect(status().isTooManyRequests())
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

    private MvcResult loginResult(String email, String password) throws Exception {
        return postJson("/api/v1/auth/login", Map.of("email", email, "password", password))
                .andExpect(status().isOk())
                .andReturn();
    }

    private JsonNode login(String email, String password) throws Exception {
        MvcResult result = loginResult(email, password);
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String extractRefreshToken(MvcResult result) {
        String setCookie = result.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).isNotNull();
        for (String part : setCookie.split(";")) {
            String trimmed = part.trim();
            if (trimmed.startsWith("edualto.refresh=")) {
                return trimmed.substring("edualto.refresh=".length());
            }
        }
        throw new IllegalStateException("RefreshToken cookie not found in Set-Cookie: " + setCookie);
    }

    private ResultActions postJson(String path, Object body) throws Exception {
        return mockMvc.perform(post(path)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }
}
