package com.edualto.auth.domain;

import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

@Entity
@Table(name = "email_otps")
public class EmailOtp {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private OtpPurpose purpose;

    @Column(nullable = false, length = 255)
    private String otpHash;

    @Column(nullable = false)
    private int attempts;

    @Column(nullable = false)
    private int maxAttempts;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant verifiedAt;

    private Instant consumedAt;

    @Column(nullable = false)
    private Instant createdAt;

    protected EmailOtp() {
    }

    public EmailOtp(User user, OtpPurpose purpose, String otpHash, Instant expiresAt, int maxAttempts) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.purpose = purpose;
        this.otpHash = otpHash;
        this.expiresAt = expiresAt;
        this.maxAttempts = maxAttempts;
    }

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = Instant.now();
    }

    public void supersede() {
        if (consumedAt == null) {
            consumedAt = Instant.now();
        }
    }

    public void verifyCode(String otp, PasswordEncoder passwordEncoder) {
        if (consumedAt != null) {
            throw invalidOtp();
        }
        if (Instant.now().isAfter(expiresAt)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED", "Mã OTP đã hết hạn");
        }
        if (attempts >= maxAttempts) {
            throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "OTP_ATTEMPT_LIMIT_EXCEEDED", "Bạn đã nhập sai OTP quá số lần cho phép");
        }

        attempts++;
        if (!passwordEncoder.matches(otp, otpHash)) {
            throw invalidOtp();
        }
        verifiedAt = Instant.now();
    }

    public void consume() {
        consumedAt = Instant.now();
    }

    public void ensureCanBeConsumed() {
        if (consumedAt != null) {
            throw invalidOtp();
        }
        if (Instant.now().isAfter(expiresAt)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED", "Mã OTP đã hết hạn");
        }
    }

    public void consumeVerifiedCode(String otp, PasswordEncoder passwordEncoder) {
        ensureCanBeConsumed();
        if (!isVerified()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "RESET_OTP_NOT_VERIFIED", "Vui lòng xác thực OTP trước khi đặt lại mật khẩu");
        }
        if (!passwordEncoder.matches(otp, otpHash)) {
            if (attempts >= maxAttempts) {
                throw new BusinessException(HttpStatus.TOO_MANY_REQUESTS, "OTP_ATTEMPT_LIMIT_EXCEEDED", "Bạn đã nhập sai OTP quá số lần cho phép");
            }
            attempts++;
            throw invalidOtp();
        }
        consume();
    }

    public boolean isActive() {
        return consumedAt == null && Instant.now().isBefore(expiresAt);
    }

    public boolean isVerified() {
        return verifiedAt != null;
    }

    private BusinessException invalidOtp() {
        return new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Mã OTP không hợp lệ");
    }

    public User getUser() {
        return user;
    }

    public OtpPurpose getPurpose() {
        return purpose;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
