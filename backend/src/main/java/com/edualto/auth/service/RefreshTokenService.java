package com.edualto.auth.service;

import com.edualto.auth.domain.RefreshToken;
import com.edualto.auth.repository.RefreshTokenRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.User;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final HashingService hashingService;
    private final Clock clock;
    private final AuthSessionRedisService authSessionRedisService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long refreshTokenTtlDays;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            HashingService hashingService,
            Clock clock,
            AuthSessionRedisService authSessionRedisService,
            @Value("${edualto.auth.refresh-token-ttl-days}") long refreshTokenTtlDays
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.hashingService = hashingService;
        this.clock = clock;
        this.authSessionRedisService = authSessionRedisService;
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
        Set<String> roles = user.getRoles() != null
                ? user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toSet())
                : Set.of();
        authSessionRedisService.saveSession(
                user.getId(),
                hash,
                user.getEmail(),
                user.getFullName(),
                roles,
                deviceName,
                Duration.ofDays(refreshTokenTtlDays)
        );
        return rawToken;
    }

    @Transactional(noRollbackFor = BusinessException.class)
    public User rotate(String rawToken) {
        String tokenHash = hashingService.sha256(rawToken);

        authSessionRedisService.getSessionByTokenHash(tokenHash).ifPresent(session -> {
            if (session.expiresAt() != null && clock.instant().isAfter(session.expiresAt())) {
                authSessionRedisService.invalidateToken(tokenHash);
                throw invalidRefreshToken();
            }
            log.debug("Xác thực refresh token từ Redis cache thành công cho user [{}]", session.userId());
        });

        RefreshToken token = requireUsable(rawToken);
        token.revoke();
        authSessionRedisService.invalidateToken(tokenHash);
        return token.getUser();
    }

    @Transactional
    public void revoke(String rawToken) {
        String hash = hashingService.sha256(rawToken);
        refreshTokenRepository.findByTokenHash(hash)
                .ifPresent(RefreshToken::revoke);
        authSessionRedisService.invalidateToken(hash);
    }

    @Transactional
    public void revokeAll(User user) {
        refreshTokenRepository.findByUserAndRevokedAtIsNull(user)
                .forEach(RefreshToken::revoke);
        authSessionRedisService.invalidateUserSession(user.getId());
    }

    private RefreshToken requireUsable(String rawToken) {
        String tokenHash = hashingService.sha256(rawToken);
        RefreshToken token = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> {
                    authSessionRedisService.invalidateToken(tokenHash);
                    return invalidRefreshToken();
                });
        if (!token.isUsable()) {
            authSessionRedisService.invalidateToken(tokenHash);
            throw invalidRefreshToken();
        }
        return token;
    }

    private BusinessException invalidRefreshToken() {
        return new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
    }
}
