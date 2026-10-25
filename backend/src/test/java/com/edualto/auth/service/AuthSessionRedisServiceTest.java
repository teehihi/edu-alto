package com.edualto.auth.service;

import com.edualto.auth.dto.UserSessionDto;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.RedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthSessionRedisServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @Mock
    private SetOperations<String, Object> setOperations;

    private AuthSessionRedisService authSessionRedisService;

    @BeforeEach
    void setUp() {
        authSessionRedisService = new AuthSessionRedisService(redisTemplate);
    }

    @Test
    @DisplayName("saveSession lưu thành công session, token key và user-tokens set vào Redis")
    void saveSession_success() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);

        UUID userId = UUID.randomUUID();
        String tokenHash = "dummy-token-hash-123";
        Duration ttl = Duration.ofDays(14);

        authSessionRedisService.saveSession(
                userId,
                tokenHash,
                "user@example.com",
                "Nguyễn Văn A",
                Set.of("STUDENT"),
                "Chrome on MacOS",
                ttl
        );

        verify(valueOperations).set(eq("auth:sessions:" + userId), any(UserSessionDto.class), eq(ttl));
        verify(valueOperations).set(eq("auth:refresh-tokens:" + tokenHash), any(UserSessionDto.class), eq(ttl));
        verify(setOperations).add(eq("auth:user-tokens:" + userId), eq(tokenHash));
        verify(redisTemplate).expire(eq("auth:user-tokens:" + userId), eq(ttl));
    }

    @Test
    @DisplayName("getSessionByTokenHash trả về session khi token tồn tại trong Redis")
    void getSessionByTokenHash_present() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        String tokenHash = "dummy-token-hash-123";
        UserSessionDto expected = new UserSessionDto(
                UUID.randomUUID(),
                "user@example.com",
                "Nguyễn Văn A",
                Set.of("STUDENT"),
                "Chrome",
                Instant.now(),
                Instant.now().plus(Duration.ofDays(7))
        );

        when(valueOperations.get("auth:refresh-tokens:" + tokenHash)).thenReturn(expected);

        var result = authSessionRedisService.getSessionByTokenHash(tokenHash);

        assertThat(result).isPresent();
        assertThat(result.get().email()).isEqualTo("user@example.com");
    }

    @Test
    @DisplayName("getSessionByTokenHash trả về empty khi không có trong Redis")
    void getSessionByTokenHash_empty() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        when(valueOperations.get("auth:refresh-tokens:missing")).thenReturn(null);

        var result = authSessionRedisService.getSessionByTokenHash("missing");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("isTokenActive trả về true khi key tồn tại trong Redis")
    void isTokenActive_returnsTrue() {
        when(redisTemplate.hasKey("auth:refresh-tokens:active-hash")).thenReturn(Boolean.TRUE);

        boolean active = authSessionRedisService.isTokenActive("active-hash");

        assertThat(active).isTrue();
    }

    @Test
    @DisplayName("invalidateToken xóa token key và loại token khỏi user-tokens set")
    void invalidateToken_removesKeys() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);

        UUID userId = UUID.randomUUID();
        String tokenHash = "token-to-revoke";
        UserSessionDto dto = new UserSessionDto(
                userId,
                "user@example.com",
                "Nguyễn Văn A",
                Set.of("STUDENT"),
                "Firefox",
                Instant.now(),
                Instant.now().plus(Duration.ofDays(7))
        );

        when(valueOperations.get("auth:refresh-tokens:" + tokenHash)).thenReturn(dto);

        authSessionRedisService.invalidateToken(tokenHash);

        verify(setOperations).remove("auth:user-tokens:" + userId, tokenHash);
        verify(redisTemplate).delete("auth:refresh-tokens:" + tokenHash);
    }

    @Test
    @DisplayName("invalidateUserSession thu hồi toàn bộ token liên quan của user")
    void invalidateUserSession_revokesAllTokens() {
        when(redisTemplate.opsForSet()).thenReturn(setOperations);

        UUID userId = UUID.randomUUID();
        when(setOperations.members("auth:user-tokens:" + userId)).thenReturn(Set.of("token1", "token2"));

        authSessionRedisService.invalidateUserSession(userId);

        verify(redisTemplate).delete("auth:refresh-tokens:token1");
        verify(redisTemplate).delete("auth:refresh-tokens:token2");
        verify(redisTemplate).delete("auth:user-tokens:" + userId);
        verify(redisTemplate).delete("auth:sessions:" + userId);
    }

    @Test
    @DisplayName("Xử lý ngoại lệ an toàn khi Redis không kết nối được")
    void resilientErrorHandling_doesNotThrow() {
        when(redisTemplate.opsForValue()).thenThrow(new RedisConnectionFailureException("Connection refused"));

        // Không ném exception ra ngoài mà trả về fallback an toàn
        var result = authSessionRedisService.getSessionByTokenHash("test-hash");
        assertThat(result).isEmpty();

        boolean active = authSessionRedisService.isTokenActive("test-hash");
        assertThat(active).isFalse();
    }
}
