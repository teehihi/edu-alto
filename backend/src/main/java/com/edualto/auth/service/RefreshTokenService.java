package com.edualto.auth.service;

import com.edualto.auth.domain.RefreshToken;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.User;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final HashingService hashingService;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long refreshTokenTtlDays;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            HashingService hashingService,
            Clock clock,
            @Value("${edualto.auth.refresh-token-ttl-days}") long refreshTokenTtlDays
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.hashingService = hashingService;
        this.clock = clock;
        this.refreshTokenTtlDays = refreshTokenTtlDays;
    }

    @Transactional
    public String issue(User user, String deviceName) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String hash = hashingService.sha256(rawToken);
        refreshTokenRepository.save(new RefreshToken(
                user,
                hash,
                deviceName,
                clock.instant().plusSeconds(refreshTokenTtlDays * 24 * 60 * 60)
        ));
        return rawToken;
    }

    @Transactional
    public User rotate(String rawToken) {
        RefreshToken token = requireUsable(rawToken);
        token.revoke();
        return token.getUser();
    }

    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hashingService.sha256(rawToken))
                .ifPresent(RefreshToken::revoke);
    }

    @Transactional
    public void revokeAll(User user) {
        refreshTokenRepository.findByUserAndRevokedAtIsNull(user)
                .forEach(RefreshToken::revoke);
    }

    private RefreshToken requireUsable(String rawToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(hashingService.sha256(rawToken))
                .orElseThrow(this::invalidRefreshToken);
        if (!token.isUsable()) {
            throw invalidRefreshToken();
        }
        return token;
    }

    private BusinessException invalidRefreshToken() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
    }
}
