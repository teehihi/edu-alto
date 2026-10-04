package com.edualto.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.edualto.auth.service.AuthRateLimitService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class AuthRateLimitServiceTest {
    @Test
    void limitsEachClientAndAllowsRetryWhenWindowExpires() {
        Clock clock = mock(Clock.class);
        Instant now = Instant.parse("2026-10-04T00:00:00Z");
        when(clock.instant()).thenReturn(now);
        AuthRateLimitService limits = new AuthRateLimitService(clock, 2, 60, 100);

        assertThat(limits.retryAfterSeconds("client-a")).isZero();
        assertThat(limits.retryAfterSeconds("client-a")).isZero();
        assertThat(limits.retryAfterSeconds("client-a")).isEqualTo(60);
        assertThat(limits.retryAfterSeconds("client-b")).isZero();
        when(clock.instant()).thenReturn(now.plusSeconds(30));
        assertThat(limits.retryAfterSeconds("client-a")).isEqualTo(30);
        when(clock.instant()).thenReturn(now.plusSeconds(60));
        assertThat(limits.retryAfterSeconds("client-a")).isZero();
    }

    @Test
    void concurrentRequestsCannotExceedTheWindowLimit() {
        AuthRateLimitService limits = new AuthRateLimitService(
                Clock.fixed(Instant.parse("2026-10-04T00:00:00Z"), ZoneOffset.UTC), 5, 60, 100);
        List<CompletableFuture<Long>> requests = IntStream.range(0, 30)
                .mapToObj(index -> CompletableFuture.supplyAsync(() -> limits.retryAfterSeconds("same-client")))
                .toList();
        assertThat(requests.stream().map(CompletableFuture::join).filter(wait -> wait == 0).count()).isEqualTo(5);
    }

    @Test
    void boundedClientCapacityDoesNotEvictAnExistingLimit() {
        AuthRateLimitService limits = new AuthRateLimitService(
                Clock.fixed(Instant.parse("2026-10-04T00:00:00Z"), ZoneOffset.UTC), 1, 60, 2);
        assertThat(limits.retryAfterSeconds("client-a")).isZero();
        assertThat(limits.retryAfterSeconds("client-b")).isZero();
        assertThat(limits.retryAfterSeconds("client-c")).isEqualTo(60);
        assertThat(limits.retryAfterSeconds("client-a")).isEqualTo(60);
    }
}
