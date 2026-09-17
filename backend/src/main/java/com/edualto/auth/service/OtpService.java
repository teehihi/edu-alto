package com.edualto.auth.service;

import com.edualto.auth.domain.EmailOtp;
import com.edualto.auth.domain.OtpPurpose;
import com.edualto.auth.infrastructure.EmailSender;
import com.edualto.auth.repository.EmailOtpRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.User;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.util.StringUtils;

@Service
public class OtpService {

    private final EmailOtpRepository emailOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long ttlMinutes;
    private final long resendCooldownSeconds;
    private final int maxAttempts;
    private final String fixedCode;

    public OtpService(
            EmailOtpRepository emailOtpRepository,
            PasswordEncoder passwordEncoder,
            EmailSender emailSender,
            Clock clock,
            @Value("${edualto.auth.otp.ttl-minutes}") long ttlMinutes,
            @Value("${edualto.auth.otp.resend-cooldown-seconds}") long resendCooldownSeconds,
            @Value("${edualto.auth.otp.max-attempts}") int maxAttempts,
            @Value("${edualto.auth.otp.fixed-code}") String fixedCode
    ) {
        this.emailOtpRepository = emailOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.clock = clock;
        this.ttlMinutes = ttlMinutes;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.maxAttempts = maxAttempts;
        this.fixedCode = fixedCode;
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public void issue(User user, OtpPurpose purpose, boolean enforceCooldown) {
        emailOtpRepository.findFirstByUserAndPurposeOrderByCreatedAtDesc(user, purpose)
                .ifPresent(existing -> {
                    if (enforceCooldown && existing.isActive()
                            && Duration.between(existing.getCreatedAt(), clock.instant()).getSeconds() < resendCooldownSeconds) {
                        throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_TOO_SOON", "Vui lòng chờ trước khi yêu cầu OTP mới");
                    }
                    existing.supersede();
                });

        String otp = generateOtp();
        EmailOtp emailOtp = new EmailOtp(
                user,
                purpose,
                passwordEncoder.encode(otp),
                clock.instant().plusSeconds(ttlMinutes * 60),
                maxAttempts
        );
        emailOtpRepository.save(emailOtp);
        emailSender.sendOtp(user.getEmail(), purpose, otp);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = BusinessException.class)
    public void verifyEmailOtp(User user, String otp) {
        EmailOtp emailOtp = requireLatestOtp(user, OtpPurpose.EMAIL_VERIFICATION);
        emailOtp.verifyCode(otp, passwordEncoder);
        emailOtp.consume();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = BusinessException.class)
    public void verifyResetOtp(User user, String otp) {
        EmailOtp emailOtp = requireLatestOtp(user, OtpPurpose.PASSWORD_RESET);
        emailOtp.verifyCode(otp, passwordEncoder);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = BusinessException.class)
    public void consumeVerifiedResetOtp(User user, String otp) {
        EmailOtp emailOtp = requireLatestOtp(user, OtpPurpose.PASSWORD_RESET);
        emailOtp.consumeVerifiedCode(otp, passwordEncoder);
    }

    private EmailOtp requireLatestOtp(User user, OtpPurpose purpose) {
        EmailOtp emailOtp = emailOtpRepository.findFirstByUserAndPurposeOrderByCreatedAtDesc(user, purpose)
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Mã OTP không hợp lệ"));
        return emailOtp;
    }

    private String generateOtp() {
        if (StringUtils.hasText(fixedCode)) {
            return fixedCode;
        }
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }
}
