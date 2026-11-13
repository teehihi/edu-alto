package com.edualto.analytics;

import com.edualto.AbstractIntegrationTest;
import com.edualto.auth.service.JwtTokenService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminMlManagementIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenService jwtTokenService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final List<UUID> fixtureUserIds = new ArrayList<>();

    @AfterEach
    void cleanFixtures() {
        for (UUID userId : fixtureUserIds) {
            jdbcTemplate.update("delete from refresh_tokens where user_id = ?", userId);
        }
        userRepository.deleteAllById(fixtureUserIds);
        fixtureUserIds.clear();
    }

    @Test
    void studentCannotAccessAdminMlEndpoints() throws Exception {
        User student = createUser("ML Test Student", "Password123", RoleName.STUDENT);
        String studentToken = jwtTokenService.createAccessToken(student);

        mockMvc.perform(post("/api/v1/admin/ml/retrain")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/admin/ml/status")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanViewStatusAndTriggerRetrain() throws Exception {
        User admin = createUser("ML System Admin", "Password123", RoleName.ADMIN);
        String adminToken = jwtTokenService.createAccessToken(admin);

        mockMvc.perform(get("/api/v1/admin/ml/status")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.championModel").isNotEmpty());

        mockMvc.perform(post("/api/v1/admin/ml/retrain")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("RUNNING"));
    }

    private User createUser(String fullName, String rawPassword, RoleName... roleNames) {
        String email = "ml-admin-it-" + UUID.randomUUID() + "@edualto.test";
        User user = new User(fullName, email, passwordEncoder.encode(rawPassword));
        for (RoleName roleName : roleNames) {
            Role role = roleRepository.findByName(roleName)
                    .orElseGet(() -> roleRepository.save(new Role(roleName, roleName.name() + " test role")));
            user.addRole(role);
        }
        user.activate();
        User saved = userRepository.save(user);
        fixtureUserIds.add(saved.getId());
        return saved;
    }
}
