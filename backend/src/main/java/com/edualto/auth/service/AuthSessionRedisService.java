package com.edualto.auth.service;

import com.edualto.auth.dto.UserSessionDto;
import java.time.Duration;
import java.time.Instant;
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

            redisTemplate.opsForValue().set(userKey, session, ttl);
            redisTemplate.opsForValue().set(tokenKey, session, ttl);
            log.debug("Đã lưu phiên đăng nhập Redis cho user [{}] (TTL: {}s)", userId, ttl.getSeconds());
        } catch (Exception e) {
            log.warn("Lưu phiên đăng nhập Redis thất bại: {}", e.getMessage());
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
            redisTemplate.delete(TOKEN_PREFIX + tokenHash);
        } catch (Exception e) {
            log.warn("Xóa phiên token Redis thất bại: {}", e.getMessage());
        }
    }

    public void invalidateUserSession(UUID userId) {
        try {
            redisTemplate.delete(KEY_PREFIX + userId);
            log.debug("Đã thu hồi phiên đăng nhập Redis cho user [{}]", userId);
        } catch (Exception e) {
            log.warn("Thu hồi phiên đăng nhập Redis thất bại: {}", e.getMessage());
        }
    }
}
