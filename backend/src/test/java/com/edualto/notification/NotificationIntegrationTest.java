package com.edualto.notification;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.notification.domain.NotificationType;
import com.edualto.notification.dto.NotificationResponse;
import com.edualto.notification.service.RealtimeNotificationService;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NotificationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenService jwtTokenService;

    @Autowired
    private RealtimeNotificationService realtimeNotificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private StorageService storageService;

    private final List<UUID> fixtureUserIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("delete from notifications where recipient_id = ?", userId);
            jdbcTemplate.update("delete from instructor_notifications where instructor_id = ?", userId);
        }
        userRepository.deleteAllById(fixtureUserIds);
        fixtureUserIds.clear();
    }

    @Test
    void realtimeNotificationsVisibilityOwnershipAndReadWorkflow() throws Exception {
        User recipient = createUser("Recipient Student", RoleName.STUDENT);
        User otherUser = createUser("Other Student", RoleName.STUDENT);

        String recipientToken = jwtTokenService.createAccessToken(recipient);
        String otherToken = jwtTokenService.createAccessToken(otherUser);

        NotificationResponse first = realtimeNotificationService.sendNotification(
                recipient.getId(),
                NotificationType.SYSTEM,
                "Chào mừng học viên",
                "Bạn đã sẵn sàng bắt đầu học tập trên EduAlto.",
                "/my-courses"
        );
        NotificationResponse second = realtimeNotificationService.sendNotification(
                recipient.getId(),
                NotificationType.DISCUSSION_REPLY,
                "Có phản hồi mới",
                "Giảng viên vừa trả lời câu hỏi của bạn.",
                "/learning/lessons/123"
        );

        mockMvc.perform(get("/api/v1/me/realtime-notifications")
                        .header("Authorization", "Bearer " + recipientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount").value(2))
                .andExpect(jsonPath("$.data.items", hasSize(2)));

        mockMvc.perform(post("/api/v1/me/realtime-notifications/{id}/read", first.id())
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOTIFICATION_NOT_FOUND"));

        mockMvc.perform(post("/api/v1/me/realtime-notifications/{id}/read", first.id())
                        .header("Authorization", "Bearer " + recipientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(first.id().toString()))
                .andExpect(jsonPath("$.data.readAt").isNotEmpty());

        mockMvc.perform(get("/api/v1/me/realtime-notifications")
                        .header("Authorization", "Bearer " + recipientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount").value(1));

        mockMvc.perform(post("/api/v1/me/realtime-notifications/read-all")
                        .header("Authorization", "Bearer " + recipientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(1));

        mockMvc.perform(get("/api/v1/me/realtime-notifications")
                        .header("Authorization", "Bearer " + recipientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount").value(0));

        // Ensure second notification is still present in the list
        mockMvc.perform(get("/api/v1/me/realtime-notifications")
                        .header("Authorization", "Bearer " + recipientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[*].id", hasItem(second.id().toString())));
    }

    @Test
    void learnerUnifiedNotificationsReturnPublishedAnnouncementsAndValidatePaginationBounds() throws Exception {
        User instructor = createUser("Announcement Instructor", RoleName.INSTRUCTOR);
        User student = createUser("Unified Notification Student", RoleName.STUDENT);

        String instructorToken = jwtTokenService.createAccessToken(instructor);
        String studentToken = jwtTokenService.createAccessToken(student);

        String createBody = mockMvc.perform(post("/api/v1/instructor/notifications")
                        .header("Authorization", "Bearer " + instructorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Lịch livestream giải đáp tuần này",
                                "description", "Thứ 7 lúc 20:00 sẽ có buổi Q&A trực tiếp.",
                                "linkUrl", "/courses",
                                "audience", "ALL_STUDENTS"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdRoot = objectMapper.readTree(createBody);
        UUID announcementId = UUID.fromString(createdRoot.get("data").get("id").asText());

        mockMvc.perform(post("/api/v1/instructor/notifications/{notificationId}/publish", announcementId)
                        .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));

        mockMvc.perform(get("/api/v1/me/notifications")
                        .header("Authorization", "Bearer " + studentToken)
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].id", hasItem(announcementId.toString())));

        mockMvc.perform(get("/api/v1/me/notifications")
                        .header("Authorization", "Bearer " + studentToken)
                        .param("page", "0")
                        .param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_PAGINATION"));
    }

    private User createUser(String fullName, RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, roleName.name() + " test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User(fullName, "notification-it-" + suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }
}
