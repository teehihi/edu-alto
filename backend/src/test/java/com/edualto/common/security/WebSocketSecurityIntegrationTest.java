package com.edualto.common.security;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.messaging.repository.MessagingRepository;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WebSocketSecurityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenService jwtTokenService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private MessagingRepository messagingRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    @Qualifier("stompAuthorizationInterceptor")
    private ChannelInterceptor stompAuthorizationInterceptor;

    @MockitoBean
    private StorageService storageService;

    private final List<UUID> fixtureUserIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update(
                    "delete from messages where conversation_id in (select id from conversations where instructor_id = ? or student_id = ?)",
                    userId,
                    userId
            );
            jdbcTemplate.update(
                    "delete from conversations where instructor_id = ? or student_id = ?",
                    userId,
                    userId
            );
        }
        userRepository.deleteAllById(fixtureUserIds);
        fixtureUserIds.clear();
    }

    @Test
    void websocketRejectsMissingTicketAndJwtQueryParam() throws Exception {
        User student = createUser("WS Student", RoleName.STUDENT, true);
        String jwt = jwtTokenService.createAccessToken(student);

        mockMvc.perform(get("/ws")
                        .header("Connection", "Upgrade")
                        .header("Upgrade", "websocket"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/ws")
                        .queryParam("token", jwt)
                        .header("Connection", "Upgrade")
                        .header("Upgrade", "websocket"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/ws/ticket"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void singleUseTicketAuthenticatesOnceAndRejectsReuseOrLockedUser() throws Exception {
        User student = createUser("WS Ticket Student", RoleName.STUDENT, true);
        String jwt = jwtTokenService.createAccessToken(student);

        String responseBody = mockMvc.perform(post("/api/v1/ws/ticket")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ticket").isNotEmpty())
                .andExpect(jsonPath("$.data.expiresInSeconds").value(30))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode root = objectMapper.readTree(responseBody);
        String ticket = root.get("data").get("ticket").asText();

        mockMvc.perform(get("/ws/info").queryParam("ticket", ticket))
                .andExpect(status().is(not(401)))
                .andExpect(status().is(not(403)));

        mockMvc.perform(get("/ws/info").queryParam("ticket", ticket))
                .andExpect(status().isUnauthorized());

        String secondResponse = mockMvc.perform(post("/api/v1/ws/ticket")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String secondTicket = objectMapper.readTree(secondResponse).get("data").get("ticket").asText();

        student.setStatus(UserStatus.LOCKED);
        userRepository.save(student);

        mockMvc.perform(get("/ws/info").queryParam("ticket", secondTicket))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void stompConnectRequiresValidActiveAuthenticationAndRejectsTokenHeaderFallback() {
        User activeUser = createUser("STOMP Active User", RoleName.STUDENT, true);
        User lockedUser = createUser("STOMP Locked User", RoleName.STUDENT, false);

        String activeJwt = jwtTokenService.createAccessToken(activeUser);
        String lockedJwt = jwtTokenService.createAccessToken(lockedUser);

        Message<?> anonymousConnect = stompFrame(StompCommand.CONNECT, null, null, null);
        assertThatThrownBy(() -> stompAuthorizationInterceptor.preSend(anonymousConnect, dummyChannel()))
                .isInstanceOf(AccessDeniedException.class);

        StompHeaderAccessor legacyTokenHeader = StompHeaderAccessor.create(StompCommand.CONNECT);
        legacyTokenHeader.setLeaveMutable(true);
        legacyTokenHeader.setNativeHeader("token", activeJwt);
        Message<?> legacyTokenConnect = MessageBuilder.createMessage(new byte[0], legacyTokenHeader.getMessageHeaders());
        assertThatThrownBy(() -> stompAuthorizationInterceptor.preSend(legacyTokenConnect, dummyChannel()))
                .isInstanceOf(AccessDeniedException.class);

        Message<?> lockedConnect = stompFrame(StompCommand.CONNECT, null, null, "Bearer " + lockedJwt);
        assertThatThrownBy(() -> stompAuthorizationInterceptor.preSend(lockedConnect, dummyChannel()))
                .isInstanceOf(AccessDeniedException.class);

        Message<?> validConnect = stompFrame(StompCommand.CONNECT, null, null, "Bearer " + activeJwt);
        Message<?> result = stompAuthorizationInterceptor.preSend(validConnect, dummyChannel());
        assertThat(result).isNotNull();
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertThat(resultAccessor.getUser()).isNotNull();
        assertThat(resultAccessor.getUser().getName()).isEqualTo(activeUser.getId().toString());

        Message<?> preAuthenticatedConnect = stompFrame(
                StompCommand.CONNECT,
                null,
                authFor(activeUser, "ROLE_STUDENT"),
                null
        );
        Message<?> preAuthResult = stompAuthorizationInterceptor.preSend(preAuthenticatedConnect, dummyChannel());
        assertThat(preAuthResult).isNotNull();
        assertThat(StompHeaderAccessor.wrap(preAuthResult).getUser().getName())
                .isEqualTo(activeUser.getId().toString());
    }

    @Test
    void stompSubscribeAndSendEnforceUserQueueAndConversationMembership() {
        User student = createUser("STOMP Student", RoleName.STUDENT, true);
        User instructor = createUser("STOMP Instructor", RoleName.INSTRUCTOR, true);
        User intruder = createUser("STOMP Intruder", RoleName.STUDENT, true);

        UUID conversationId = messagingRepository.openConversation(instructor.getId(), student.getId());

        UsernamePasswordAuthenticationToken studentAuth = authFor(student, "ROLE_STUDENT");
        UsernamePasswordAuthenticationToken instructorAuth = authFor(instructor, "ROLE_INSTRUCTOR");
        UsernamePasswordAuthenticationToken intruderAuth = authFor(intruder, "ROLE_STUDENT");

        // User queues permitted for authenticated users
        stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/user/queue/notifications", studentAuth, null),
                dummyChannel()
        );
        stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/user/queue/messages", studentAuth, null),
                dummyChannel()
        );
        stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/user/queue/presence", studentAuth, null),
                dummyChannel()
        );

        // Participant conversation topic and SEND allowed
        stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/topic/conversations/" + conversationId, studentAuth, null),
                dummyChannel()
        );
        stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/topic/conversations/" + conversationId, instructorAuth, null),
                dummyChannel()
        );
        stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SEND, "/app/conversations/" + conversationId + "/messages", studentAuth, null),
                dummyChannel()
        );

        // Forbidden subscriptions & sends
        assertThatThrownBy(() -> stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/topic/notifications/" + instructor.getId(), studentAuth, null),
                dummyChannel()
        )).isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() -> stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/topic/notifications/" + student.getId(), studentAuth, null),
                dummyChannel()
        )).isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() -> stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/topic/conversations/" + conversationId, intruderAuth, null),
                dummyChannel()
        )).isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() -> stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SUBSCRIBE, "/topic/anything", studentAuth, null),
                dummyChannel()
        )).isInstanceOf(AccessDeniedException.class);

        assertThatThrownBy(() -> stompAuthorizationInterceptor.preSend(
                stompFrame(StompCommand.SEND, "/app/conversations/" + conversationId + "/messages", intruderAuth, null),
                dummyChannel()
        )).isInstanceOf(AccessDeniedException.class);
    }

    private Message<?> stompFrame(
            StompCommand command,
            String destination,
            UsernamePasswordAuthenticationToken auth,
            String authorizationHeader
    ) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setLeaveMutable(true);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (auth != null) {
            accessor.setUser(auth);
        }
        if (authorizationHeader != null) {
            accessor.setNativeHeader("Authorization", authorizationHeader);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private UsernamePasswordAuthenticationToken authFor(User user, String roleAuthority) {
        AuthenticatedUser principal = new AuthenticatedUser(
                user.getId(),
                user.getEmail(),
                List.of(new SimpleGrantedAuthority(roleAuthority))
        );
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    private MessageChannel dummyChannel() {
        return (message, timeout) -> true;
    }

    private User createUser(String fullName, RoleName roleName, boolean active) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, roleName.name() + " test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User(fullName, "ws-sec-it-" + suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        if (active) {
            user.activate();
        } else {
            user.setStatus(UserStatus.LOCKED);
        }
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }
}
