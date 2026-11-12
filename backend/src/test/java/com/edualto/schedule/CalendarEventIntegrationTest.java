package com.edualto.schedule;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CalendarEventIntegrationTest extends AbstractIntegrationTest {

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

    @MockitoBean
    private StorageService storageService;

    private final List<UUID> fixtureUserIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("delete from calendar_events where user_id = ?", userId);
        }
        userRepository.deleteAllById(fixtureUserIds);
        fixtureUserIds.clear();
    }

    @Test
    void authenticatedUserCreatesListsUpdatesAndDeletesPersonalCalendarEvent() throws Exception {
        User userA = createUser("Calendar User A", RoleName.STUDENT);
        String tokenA = jwtTokenService.createAccessToken(userA);

        OffsetDateTime startsAt = OffsetDateTime.of(2026, 11, 15, 9, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime endsAt = startsAt.plusHours(2);

        String createResponse = mockMvc.perform(post("/api/v1/me/calendar-events")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Ôn tập Spring Boot Testcontainers",
                                "description", "Hoàn thành bài tập chương 4",
                                "startsAt", startsAt.toString(),
                                "endsAt", endsAt.toString(),
                                "status", "SCHEDULED"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Ôn tập Spring Boot Testcontainers"))
                .andExpect(jsonPath("$.data.status").value("SCHEDULED"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode createdRoot = objectMapper.readTree(createResponse);
        UUID eventId = UUID.fromString(createdRoot.get("data").get("id").asText());

        mockMvc.perform(get("/api/v1/me/calendar-events")
                        .header("Authorization", "Bearer " + tokenA)
                        .param("from", startsAt.minusDays(1).toString())
                        .param("to", endsAt.plusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[*].id", hasItem(eventId.toString())));

        mockMvc.perform(put("/api/v1/me/calendar-events/{eventId}", eventId)
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Đã hoàn thành ôn tập Testcontainers",
                                "description", "Xong toàn bộ bài tập",
                                "startsAt", startsAt.toString(),
                                "endsAt", endsAt.plusHours(1).toString(),
                                "status", "COMPLETED"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Đã hoàn thành ôn tập Testcontainers"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        mockMvc.perform(get("/api/v1/me/calendar-events/{eventId}", eventId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Đã hoàn thành ôn tập Testcontainers"));

        mockMvc.perform(delete("/api/v1/me/calendar-events/{eventId}", eventId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/me/calendar-events/{eventId}", eventId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("CALENDAR_EVENT_NOT_FOUND"));
    }

    @Test
    void otherUserCannotReadUpdateOrDeleteAnotherUsersCalendarEvent() throws Exception {
        User userA = createUser("Calendar Owner A", RoleName.STUDENT);
        User userB = createUser("Calendar Intruder B", RoleName.STUDENT);
        String tokenA = jwtTokenService.createAccessToken(userA);
        String tokenB = jwtTokenService.createAccessToken(userB);

        OffsetDateTime startsAt = OffsetDateTime.of(2026, 11, 16, 14, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime endsAt = startsAt.plusHours(1);

        String createResponse = mockMvc.perform(post("/api/v1/me/calendar-events")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Lịch học riêng tư",
                                "description", "Không chia sẻ",
                                "startsAt", startsAt.toString(),
                                "endsAt", endsAt.toString(),
                                "status", "SCHEDULED"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        UUID eventId = UUID.fromString(objectMapper.readTree(createResponse).get("data").get("id").asText());

        mockMvc.perform(get("/api/v1/me/calendar-events/{eventId}", eventId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("CALENDAR_EVENT_NOT_FOUND"));

        mockMvc.perform(put("/api/v1/me/calendar-events/{eventId}", eventId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Cập nhật trái phép",
                                "description", "Không hợp lệ",
                                "startsAt", startsAt.toString(),
                                "endsAt", endsAt.toString(),
                                "status", "CANCELLED"
                        ))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("CALENDAR_EVENT_NOT_FOUND"));

        mockMvc.perform(delete("/api/v1/me/calendar-events/{eventId}", eventId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("CALENDAR_EVENT_NOT_FOUND"));
    }

    private User createUser(String fullName, RoleName roleName) {
        Role role = roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName, roleName.name() + " test role")));
        String suffix = UUID.randomUUID().toString();
        User user = new User(fullName, "schedule-it-" + suffix + "@edualto.test", "not-a-real-password-hash");
        user.addRole(role);
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }
}
