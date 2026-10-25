package com.edualto.auth.service;

import com.edualto.auth.dto.UserSessionDto;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuthSessionRedisService {

    private static final Logger log = LoggerFactory.getLogger(AuthSessionRedisService.class);
    private static final String KEY_PREFIX = "auth:sessions:";
    private static final String TOKEN_PREFIX = "auth:refresh-tokens:";
    private static final String USER_TOKENS_PREFIX = "auth:user-tokens:";

    private final RedisTemplate<String, Object> redisTemplate;

    public AuthSessionRedisService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void saveSession(UUID userId, String tokenHash, String email, String fullName, Set<String> roles, String deviceName, Duration ttl) {
        try {
            UserSessionDto session = new UserSessionDto(
                    userId,
                    email,
                    fullName,
                    roles,
                    deviceName,
                    Instant.now(),
                    Instant.now().plus(ttl)
            );
            String userKey = KEY_PREFIX + userId;
            String tokenKey = TOKEN_PREFIX + tokenHash;
            String userTokensKey = USER_TOKENS_PREFIX + userId;

            redisTemplate.opsForValue().set(userKey, session, ttl);
            redisTemplate.opsForValue().set(tokenKey, session, ttl);
            redisTemplate.opsForSet().add(userTokensKey, tokenHash);
            redisTemplate.expire(userTokensKey, ttl);
            log.debug("Đã lưu phiên đăng nhập Redis cho user [{}] (TTL: {}s)", userId, ttl.getSeconds());
        } catch (Exception e) {
            log.warn("Lưu phiên đăng nhập Redis thất bại: {}", e.getMessage());
        }
    }

    public Optional<UserSessionDto> getSessionByTokenHash(String tokenHash) {
        try {
            Object obj = redisTemplate.opsForValue().get(TOKEN_PREFIX + tokenHash);
            if (obj instanceof UserSessionDto dto) {
                return Optional.of(dto);
            }
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Đọc phiên token Redis thất bại cho tokenHash: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public boolean isTokenActive(String tokenHash) {
        try {
            Boolean exists = redisTemplate.hasKey(TOKEN_PREFIX + tokenHash);
            return Boolean.TRUE.equals(exists);
        } catch (Exception e) {
            log.warn("Kiểm tra token Redis thất bại: {}", e.getMessage());
            return false;
        }
    }

    public UserSessionDto getSession(UUID userId) {
        try {
            Object obj = redisTemplate.opsForValue().get(KEY_PREFIX + userId);
            return obj instanceof UserSessionDto dto ? dto : null;
        } catch (Exception e) {
            log.warn("Đọc phiên đăng nhập Redis thất bại cho user [{}]: {}", userId, e.getMessage());
            return null;
        }
    }

    public void invalidateToken(String tokenHash) {
        try {
            Object obj = redisTemplate.opsForValue().get(TOKEN_PREFIX + tokenHash);
            if (obj instanceof UserSessionDto dto && dto.userId() != null) {
                redisTemplate.opsForSet().remove(USER_TOKENS_PREFIX + dto.userId(), tokenHash);
            }
            redisTemplate.delete(TOKEN_PREFIX + tokenHash);
        } catch (Exception e) {
            log.warn("Xóa phiên token Redis thất bại: {}", e.getMessage());
        }
    }

    public void invalidateUserSession(UUID userId) {
        try {
            String userTokensKey = USER_TOKENS_PREFIX + userId;
            Set<Object> tokenHashes = redisTemplate.opsForSet().members(userTokensKey);
            if (tokenHashes != null && !tokenHashes.isEmpty()) {
                for (Object tokenHash : tokenHashes) {
                    if (tokenHash instanceof String hash) {
                        redisTemplate.delete(TOKEN_PREFIX + hash);
                    }
                }
            }
            redisTemplate.delete(userTokensKey);
            redisTemplate.delete(KEY_PREFIX + userId);
            log.debug("Đã thu hồi phiên đăng nhập Redis cho user [{}]", userId);
        } catch (Exception e) {
            log.warn("Thu hồi phiên đăng nhập Redis thất bại: {}", e.getMessage());
        }
    }
}
