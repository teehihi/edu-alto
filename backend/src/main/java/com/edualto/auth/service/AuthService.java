package com.edualto.auth.service;

import com.edualto.auth.domain.OtpPurpose;
import com.edualto.auth.dto.AuthMessageResponse;
import com.edualto.auth.dto.AuthTokenResponse;
import com.edualto.auth.dto.LoginRequest;
import com.edualto.auth.dto.RegisterRequest;
import com.edualto.auth.dto.ResetPasswordRequest;
import com.edualto.auth.dto.VerifyOtpRequest;
import com.edualto.common.exception.BusinessException;
import com.edualto.profile.service.ProfileService;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.dto.UserResponse;
import com.edualto.user.repository.UserRepository;
import com.edualto.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String RESET_MESSAGE = "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email của bạn.";

    private final UserRepository userRepository;
    private final UserService userService;
    private final ProfileService profileService;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(
            UserRepository userRepository,
            UserService userService,
            ProfileService profileService,
            PasswordEncoder passwordEncoder,
            OtpService otpService,
            JwtTokenService jwtTokenService,
            RefreshTokenService refreshTokenService
    ) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.profileService = profileService;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public AuthMessageResponse register(RegisterRequest request) {
        ensurePasswordsMatch(request.password(), request.confirmPassword());
        RoleName targetRole = request.role() != null ? request.role() : RoleName.STUDENT;

        if (targetRole == RoleName.ADMIN) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Không thể đăng ký tài khoản Quản trị viên");
        }
        if (targetRole != RoleName.STUDENT && targetRole != RoleName.INSTRUCTOR) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Vai trò đăng ký không hợp lệ");
        }

        if (targetRole == RoleName.INSTRUCTOR && (request.expertise() == null || request.expertise().isBlank())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "MISSING_EXPERTISE", "Vui lòng nhập chuyên môn giảng dạy");
        }

        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email đã được sử dụng");
        }

        User user = userService.createPendingUser(
                request.fullName().trim(),
                email,
                passwordEncoder.encode(request.password()),
                targetRole
        );

        if (targetRole == RoleName.INSTRUCTOR) {
            profileService.createInstructorProfile(user.getId(), request.expertise(), request.bio());
        } else {
            profileService.createStudentProfile(user.getId(), request.learningGoal(), request.bio());
        }

        otpService.issue(user, OtpPurpose.EMAIL_VERIFICATION, false);
        return new AuthMessageResponse("Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.");
    }

    @Transactional
    public AuthMessageResponse verifyEmail(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Mã OTP không hợp lệ"));
        if (user.getStatus() == UserStatus.ACTIVE) {
            return new AuthMessageResponse("Tài khoản đã được xác thực.");
        }
        otpService.verifyEmailOtp(user, request.otp());
        user.activate();
        return new AuthMessageResponse("Xác thực email thành công.");
    }

    @Transactional
    public AuthMessageResponse resendVerification(String emailValue) {
        User user = userRepository.findByEmail(normalizeEmail(emailValue))
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));
        if (user.getStatus() == UserStatus.ACTIVE) {
            return new AuthMessageResponse("Tài khoản đã được xác thực.");
        }
        otpService.issue(user, OtpPurpose.EMAIL_VERIFICATION, true);
        return new AuthMessageResponse("Mã OTP mới đã được gửi đến email của bạn.");
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public AuthResult login(LoginRequest request, String deviceName) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(this::invalidCredentials);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            try {
                otpService.issue(user, OtpPurpose.EMAIL_VERIFICATION, false);
            } catch (Exception ignored) {
                // If email sending or cooldown fails, still enforce verification
            }
            throw new BusinessException(HttpStatus.FORBIDDEN, "ACCOUNT_NOT_VERIFIED", "Tài khoản chưa được xác thực. Mã OTP mới đã được gửi đến email của bạn.");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw invalidCredentials();
        }

        user.recordLogin();
        String refreshToken = refreshTokenService.issue(user, deviceName);
        return new AuthResult(tokenResponse(user), refreshToken);
    }

    @Transactional
    public AuthResult refresh(String rawRefreshToken) {
        User user = refreshTokenService.rotate(rawRefreshToken);
        if (user.getStatus() != UserStatus.ACTIVE) {
            refreshTokenService.revokeAll(user);
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
        }
        String nextRefreshToken = refreshTokenService.issue(user, null);
        return new AuthResult(tokenResponse(user), nextRefreshToken);
    }

    @Transactional
    public AuthMessageResponse logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
        return new AuthMessageResponse("Đăng xuất thành công.");
    }


    @Transactional
    public AuthMessageResponse forgotPassword(String emailValue) {
        userRepository.findByEmail(normalizeEmail(emailValue))
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .ifPresent(user -> {
                    try {
                        otpService.issue(user, OtpPurpose.PASSWORD_RESET, true);
                    } catch (BusinessException ignored) {
                        // Keep password-reset response non-enumerating.
                    }
                });
        return new AuthMessageResponse(RESET_MESSAGE);
    }

    @Transactional
    public AuthMessageResponse verifyResetOtp(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Mã OTP không hợp lệ"));
        otpService.verifyResetOtp(user, request.otp());
        return new AuthMessageResponse("OTP đặt lại mật khẩu hợp lệ.");
    }

    @Transactional
    public AuthMessageResponse resetPassword(ResetPasswordRequest request) {
        ensurePasswordsMatch(request.newPassword(), request.confirmPassword());
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_RESET_REQUEST", "Yêu cầu đặt lại mật khẩu không hợp lệ"));
        otpService.consumeVerifiedResetOtp(user, request.otp());
        user.changePassword(passwordEncoder.encode(request.newPassword()));
        refreshTokenService.revokeAll(user);
        return new AuthMessageResponse("Đặt lại mật khẩu thành công.");
    }

    private AuthTokenResponse tokenResponse(User user) {
        return new AuthTokenResponse(
                "Bearer",
                jwtTokenService.createAccessToken(user),
                jwtTokenService.accessTokenTtlSeconds(),
                userService.getUserResponse(user.getId())
        );
    }

    public record AuthResult(AuthTokenResponse response, String refreshToken) {
    }

    private void ensurePasswordsMatch(String password, String confirmPassword) {
        if (!password.equals(confirmPassword)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "PASSWORD_CONFIRMATION_MISMATCH", "Mật khẩu xác nhận không khớp");
        }
    }

    private BusinessException invalidCredentials() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
