package com.edualto.auth.service;

import com.edualto.common.security.AuthenticatedUser;
import com.edualto.user.domain.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {

    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder URL_DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final byte[] secret;
    private final long accessTokenTtlSeconds;
    private final String issuer;

    public JwtTokenService(
            ObjectMapper objectMapper,
            Clock clock,
            @Value("${edualto.auth.jwt.secret}") String secret,
            @Value("${edualto.auth.jwt.access-token-ttl-minutes}") long accessTokenTtlMinutes,
            @Value("${edualto.auth.jwt.issuer}") String issuer
    ) {
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes");
        }
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.accessTokenTtlSeconds = accessTokenTtlMinutes * 60;
        this.issuer = issuer;
    }

    public String createAccessToken(User user) {
        Instant now = clock.instant();
        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .sorted()
                .toList();

        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> payload = Map.of(
                "iss", issuer,
                "sub", user.getId().toString(),
                "email", user.getEmail(),
                "roles", roles,
                "jti", UUID.randomUUID().toString(),
                "iat", now.getEpochSecond(),
                "exp", now.plusSeconds(accessTokenTtlSeconds).getEpochSecond()
        );

        String encodedHeader = encodeJson(header);
        String encodedPayload = encodeJson(payload);
        String signingInput = encodedHeader + "." + encodedPayload;
        return signingInput + "." + sign(signingInput);
    }

    public Optional<AuthenticatedUser> parseAccessToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }

            String signingInput = parts[0] + "." + parts[1];
            if (!MessageDigest.isEqual(sign(signingInput).getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
                return Optional.empty();
            }

            Map<String, Object> payload = objectMapper.readValue(URL_DECODER.decode(parts[1]), new TypeReference<>() {
            });
            if (!issuer.equals(payload.get("iss"))) {
                return Optional.empty();
            }

            long exp = ((Number) payload.get("exp")).longValue();
            if (clock.instant().getEpochSecond() >= exp) {
                return Optional.empty();
            }

            UUID userId = UUID.fromString((String) payload.get("sub"));
            String email = (String) payload.get("email");
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) payload.get("roles");
            List<SimpleGrantedAuthority> authorities = roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .toList();
            return Optional.of(new AuthenticatedUser(userId, email, authorities));
        } catch (Exception exception) {
            return Optional.empty();
        }
    }

    public long accessTokenTtlSeconds() {
        return accessTokenTtlSeconds;
    }

    private String encodeJson(Object value) {
        try {
            return URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to encode JWT", exception);
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign JWT", exception);
        }
    }
}
