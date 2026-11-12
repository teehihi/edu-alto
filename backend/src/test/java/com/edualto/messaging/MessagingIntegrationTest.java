package com.edualto.messaging;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.messaging.dto.RealtimeMessageEvent;
import com.edualto.messaging.repository.MessagingRepository;
import com.edualto.messaging.service.MessagingPresenceService;
import com.edualto.messaging.service.MessagingService;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MessagingIntegrationTest extends AbstractIntegrationTest {

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
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MessagingRepository messagingRepository;

    @Autowired
    private MessagingPresenceService messagingPresenceService;

    @MockitoBean
    private StorageService storageService;

    private final List<UUID> fixtureUserIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("delete from messages where conversation_id in (select id from conversations where instructor_id = ? or student_id = ?)", userId, userId);
            jdbcTemplate.update("delete from conversations where instructor_id = ? or student_id = ?", userId, userId);
        }
        userRepository.deleteAllById(fixtureUserIds);
        fixtureUserIds.clear();
    }

    @Test
    void studentStartsConversationFollowUpAndInstructorReadsAndReplies() throws Exception {
        User studentA = createUser("Messaging Student A", RoleName.STUDENT);
        User instructorC = createUser("Messaging Instructor C", RoleName.INSTRUCTOR);

        String studentToken = jwtTokenService.createAccessToken(studentA);
        String instructorToken = jwtTokenService.createAccessToken(instructorC);

        String startResponse = mockMvc.perform(post("/api/v1/me/instructors/{instructorId}/conversations", instructorC.getId())
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "body", "Em chào thầy, em muốn hỏi thêm về lộ trình học ạ."
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.conversationId").isNotEmpty())
                .andExpect(jsonPath("$.data.message.senderId").value(studentA.getId().toString()))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode startRoot = objectMapper.readTree(startResponse);
        UUID conversationId = UUID.fromString(startRoot.get("data").get("conversationId").asText());

        mockMvc.perform(post("/api/v1/me/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "body", "Cụ thể là phần Spring Boot JPA ạ."
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.body").value("Cụ thể là phần Spring Boot JPA ạ."));

        mockMvc.perform(get("/api/v1/instructor/conversations")
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].unreadCount").value(2));

        mockMvc.perform(get("/api/v1/instructor/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        mockMvc.perform(get("/api/v1/instructor/conversations")
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].unreadCount").value(0));

        mockMvc.perform(post("/api/v1/instructor/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "body", "Chào em, thầy sẽ hướng dẫn phần JPA ở chương 3 nhé."
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.senderId").value(instructorC.getId().toString()));

        mockMvc.perform(get("/api/v1/me/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(3)));
    }

    @Test
    void otherStudentCannotReadOrSendInAnotherStudentsConversation() throws Exception {
        User studentA = createUser("Owner Student A", RoleName.STUDENT);
        User studentB = createUser("Intruder Student B", RoleName.STUDENT);
        User instructorC = createUser("Messaging Instructor", RoleName.INSTRUCTOR);

        String studentAToken = jwtTokenService.createAccessToken(studentA);
        String studentBToken = jwtTokenService.createAccessToken(studentB);

        String startResponse = mockMvc.perform(post("/api/v1/me/instructors/{instructorId}/conversations", instructorC.getId())
                        .header("Authorization", "Bearer " + studentAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("body", "Tin nhắn riêng tư"))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        UUID conversationId = UUID.fromString(objectMapper.readTree(startResponse).get("data").get("conversationId").asText());

        mockMvc.perform(get("/api/v1/me/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + studentBToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("CONVERSATION_NOT_FOUND"));

        mockMvc.perform(post("/api/v1/me/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + studentBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("body", "Tin nhắn trái phép"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("CONVERSATION_NOT_FOUND"));
    }

    @Test
    void instructorBlocksConversationAndStudentReceivesMessagingBlockedError() throws Exception {
        User studentA = createUser("Blocked Student A", RoleName.STUDENT);
        User instructorC = createUser("Blocking Instructor C", RoleName.INSTRUCTOR);

        String studentToken = jwtTokenService.createAccessToken(studentA);
        String instructorToken = jwtTokenService.createAccessToken(instructorC);

        String startResponse = mockMvc.perform(post("/api/v1/me/instructors/{instructorId}/conversations", instructorC.getId())
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("body", "Tin nhắn ban đầu"))))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        UUID conversationId = UUID.fromString(objectMapper.readTree(startResponse).get("data").get("conversationId").asText());

        mockMvc.perform(put("/api/v1/instructor/conversations/{conversationId}/block", conversationId)
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("blocked", true))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/me/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("body", "Tin nhắn sau khi bị chặn"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("MESSAGING_BLOCKED"));
    }

    @Test
    void sendingMessageEmitsRealtimeEventAndTracksPresenceAndParticipation() throws Exception {
        User student = createUser("Realtime Student", RoleName.STUDENT);
        User instructor = createUser("Realtime Instructor", RoleName.INSTRUCTOR);
        User outsider = createUser("Realtime Outsider", RoleName.STUDENT);

        SimpMessagingTemplate mockTemplate = mock(SimpMessagingTemplate.class);
        MessagingService realtimeMessagingService = new MessagingService(messagingRepository, mockTemplate);

        var started = realtimeMessagingService.startStudentConversation(
                student.getId(),
                instructor.getId(),
                "Em chào thầy ạ"
        );
        UUID conversationId = started.conversationId();

        assertThat(messagingRepository.isParticipant(conversationId, student.getId())).isTrue();
        assertThat(messagingRepository.isParticipant(conversationId, instructor.getId())).isTrue();
        assertThat(messagingRepository.isParticipant(conversationId, outsider.getId())).isFalse();

        ArgumentCaptor<RealtimeMessageEvent> eventCaptor = ArgumentCaptor.forClass(RealtimeMessageEvent.class);
        verify(mockTemplate).convertAndSendToUser(
                eq(instructor.getId().toString()),
                eq("/queue/messages"),
                eventCaptor.capture()
        );
        verify(mockTemplate).convertAndSendToUser(
                eq(student.getId().toString()),
                eq("/queue/messages"),
                eventCaptor.capture()
        );
        assertThat(eventCaptor.getAllValues().getFirst().type()).isEqualTo("MESSAGE_CREATED");
        assertThat(eventCaptor.getAllValues().getFirst().conversationId()).isEqualTo(conversationId);
        assertThat(eventCaptor.getAllValues().getFirst().data().body()).isEqualTo("Em chào thầy ạ");

        String studentToken = jwtTokenService.createAccessToken(student);
        AuthenticatedUser instructorPrincipal = new AuthenticatedUser(
                instructor.getId(),
                instructor.getEmail(),
                List.of(new SimpleGrantedAuthority("ROLE_INSTRUCTOR"))
        );
        UsernamePasswordAuthenticationToken instructorAuth = new UsernamePasswordAuthenticationToken(
                instructorPrincipal,
                null,
                instructorPrincipal.getAuthorities()
        );
        Message<byte[]> dummyMessage = MessageBuilder.withPayload(new byte[0]).build();

        messagingPresenceService.handleSessionConnected(
                new SessionConnectedEvent(this, dummyMessage, instructorAuth)
        );

        mockMvc.perform(get("/api/v1/me/presence")
                        .header("Authorization", "Bearer " + studentToken)
                        .param("userIds", instructor.getId().toString(), outsider.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].userId").value(instructor.getId().toString()))
                .andExpect(jsonPath("$.data[0].online").value(true))
                .andExpect(jsonPath("$.data[1].userId").value(outsider.getId().toString()))
                .andExpect(jsonPath("$.data[1].online").value(false));

        messagingPresenceService.handleSessionDisconnect(
                new SessionDisconnectEvent(this, dummyMessage, "session-1", CloseStatus.NORMAL, instructorAuth)
        );

        mockMvc.perform(get("/api/v1/me/presence")
                        .header("Authorization", "Bearer " + studentToken)
                        .param("userIds", instructor.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].online").value(false));
    }

    private User createUser(String fullName, RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, roleName.name() + " test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User(fullName, "messaging-it-" + suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }
}
