package com.edualto.common.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.edualto.auth.dto.UserSessionDto;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.CourseCatalogResponse;
import com.edualto.course.dto.CourseInstructorSummaryResponse;
import com.edualto.course.dto.CourseListItemResponse;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;

class RedisSerializationTest {

    private final RedisSerializer<Object> serializer = new RedisCacheConfig().createRedisSerializer();

    @Test
    void roundTripsUserSessionDtoRecordWithInstantAndSet() {
        UUID userId = UUID.randomUUID();
        Instant loggedInAt = Instant.parse("2026-10-08T12:00:00Z");
        Instant expiresAt = Instant.parse("2026-10-22T12:00:00Z");
        UserSessionDto original = new UserSessionDto(
                userId,
                "student@edualto.vn",
                "Nguyễn Văn A",
                Set.of("STUDENT", "INSTRUCTOR"),
                "Chrome on Linux",
                loggedInAt,
                expiresAt
        );

        byte[] serialized = serializer.serialize(original);
        Object deserialized = serializer.deserialize(serialized);

        assertThat(deserialized).isInstanceOf(UserSessionDto.class);
        UserSessionDto restored = (UserSessionDto) deserialized;
        assertThat(restored).isEqualTo(original);
        assertThat(restored.userId()).isEqualTo(userId);
        assertThat(restored.roles()).containsExactlyInAnyOrder("STUDENT", "INSTRUCTOR");
        assertThat(restored.loggedInAt()).isEqualTo(loggedInAt);
        assertThat(restored.expiresAt()).isEqualTo(expiresAt);
    }

    @Test
    void roundTripsCourseCatalogResponseRecordWithNestedItemsBigDecimalAndEnums() {
        CourseInstructorSummaryResponse instructor = new CourseInstructorSummaryResponse(
                UUID.randomUUID(),
                "Giảng viên A",
                "https://cdn.edualto.vn/avatar.png",
                "Kỹ sư phần mềm",
                "giang-vien-a"
        );
        CourseListItemResponse item = new CourseListItemResponse(
                UUID.randomUUID(),
                "Spring Boot thực chiến",
                "spring-boot-thuc-chien",
                "Xây dựng hệ thống LMS chuẩn production",
                "https://cdn.edualto.vn/thumb.png",
                new BigDecimal("499000.00"),
                new BigDecimal("799000.00"),
                CourseLevel.INTERMEDIATE,
                "vi",
                CourseStatus.PUBLISHED,
                Instant.parse("2026-09-01T08:30:00Z"),
                instructor
        );
        CourseCatalogResponse original = new CourseCatalogResponse(
                List.of(item),
                0,
                12,
                1L,
                1
        );

        byte[] serialized = serializer.serialize(original);
        Object deserialized = serializer.deserialize(serialized);

        assertThat(deserialized).isInstanceOf(CourseCatalogResponse.class);
        CourseCatalogResponse restored = (CourseCatalogResponse) deserialized;
        assertThat(restored).isEqualTo(original);
        assertThat(restored.items()).hasSize(1);
        assertThat(restored.items().getFirst().price()).isEqualByComparingTo("499000.00");
        assertThat(restored.items().getFirst().level()).isEqualTo(CourseLevel.INTERMEDIATE);
        assertThat(restored.items().getFirst().status()).isEqualTo(CourseStatus.PUBLISHED);
    }

    @Test
    void roundTripsUnmodifiableSet() {
        Set<String> permissions = Set.of("ADMIN_READ", "USER_WRITE");

        byte[] serialized = serializer.serialize(permissions);
        Object deserialized = serializer.deserialize(serialized);

        assertThat(deserialized).isInstanceOf(Set.class);
        @SuppressWarnings("unchecked")
        Set<String> restored = (Set<String>) deserialized;
        assertThat(restored).containsExactlyInAnyOrder("ADMIN_READ", "USER_WRITE");
    }

    @Test
    void rejectsDisallowedGadgetTypesDuringDeserialization() {
        byte[] scriptEnginePayload = """
                {
                  "@class": "javax.script.ScriptEngineManager"
                }
                """.getBytes(StandardCharsets.UTF_8);

        byte[] nestedScriptEnginePayload = """
                [
                  "java.util.ArrayList",
                  [
                    {
                      "@class": "javax.script.ScriptEngineManager"
                    }
                  ]
                ]
                """.getBytes(StandardCharsets.UTF_8);

        byte[] processBuilderPayload = """
                {
                  "@class": "java.lang.ProcessBuilder",
                  "command": ["id"]
                }
                """.getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> serializer.deserialize(scriptEnginePayload))
                .isInstanceOf(SerializationException.class);
        assertThatThrownBy(() -> serializer.deserialize(nestedScriptEnginePayload))
                .isInstanceOf(SerializationException.class);
        assertThatThrownBy(() -> serializer.deserialize(processBuilderPayload))
                .isInstanceOf(SerializationException.class);
    }
}
