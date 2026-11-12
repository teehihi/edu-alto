package com.edualto.admin;

import com.edualto.admin.repository.AdminRepository;
import com.edualto.admin.service.AdminDashboardService;
import com.edualto.auth.service.RefreshTokenService;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import com.edualto.user.service.UserService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceTest {

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AdminDashboardService adminDashboardService;

    private UUID adminId;
    private User targetUser;
    private UUID targetUserId;

    @BeforeEach
    void setUp() {
        adminId = UUID.randomUUID();
        targetUser = new User("Nguyen Van B", "student@edualto.vn", "old-hash");
        targetUser.activate();
        targetUserId = targetUser.getId();
    }

    @Test
    void updateUserRolesRevokesAllRefreshTokens() {
        Role instructorRole = new Role(RoleName.INSTRUCTOR, "INSTRUCTOR role");
        when(userService.requireById(targetUserId)).thenReturn(targetUser);
        when(roleRepository.findByName(RoleName.INSTRUCTOR)).thenReturn(Optional.of(instructorRole));
        when(userRepository.save(targetUser)).thenReturn(targetUser);

        adminDashboardService.updateUserRoles(adminId, targetUserId, List.of("INSTRUCTOR"));

        assertThat(targetUser.getRoles()).containsExactly(instructorRole);
        verify(userRepository).save(targetUser);
        verify(refreshTokenService).revokeAll(targetUser);
    }

    @Test
    void updateUserStatusDisabledRevokesAllRefreshTokens() {
        when(userService.requireById(targetUserId)).thenReturn(targetUser);
        when(userRepository.save(targetUser)).thenReturn(targetUser);

        adminDashboardService.updateUserStatus(adminId, targetUserId, "DISABLED");

        assertThat(targetUser.getStatus()).isEqualTo(UserStatus.DISABLED);
        verify(userRepository).save(targetUser);
        verify(refreshTokenService).revokeAll(targetUser);
    }

    @Test
    void updateUserStatusLockedRevokesAllRefreshTokens() {
        when(userService.requireById(targetUserId)).thenReturn(targetUser);
        when(userRepository.save(targetUser)).thenReturn(targetUser);

        adminDashboardService.updateUserStatus(adminId, targetUserId, "LOCKED");

        assertThat(targetUser.getStatus()).isEqualTo(UserStatus.LOCKED);
        verify(userRepository).save(targetUser);
        verify(refreshTokenService).revokeAll(targetUser);
    }

    @Test
    void updateUserStatusActiveDoesNotRevokeRefreshTokens() {
        targetUser.setStatus(UserStatus.DISABLED);
        when(userService.requireById(targetUserId)).thenReturn(targetUser);
        when(userRepository.save(targetUser)).thenReturn(targetUser);

        adminDashboardService.updateUserStatus(adminId, targetUserId, "ACTIVE");

        assertThat(targetUser.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(userRepository).save(targetUser);
        verify(refreshTokenService, never()).revokeAll(any());
    }

    @Test
    void resetUserPasswordEncodesSavesAndRevokesAllRefreshTokens() {
        when(userService.requireById(targetUserId)).thenReturn(targetUser);
        when(passwordEncoder.encode("NewSecret123")).thenReturn("encoded-secret");
        when(userRepository.save(targetUser)).thenReturn(targetUser);

        adminDashboardService.resetUserPassword(adminId, targetUserId, "  NewSecret123  ");

        assertThat(targetUser.getPasswordHash()).isEqualTo("encoded-secret");
        verify(userRepository).save(targetUser);
        verify(refreshTokenService).revokeAll(targetUser);
    }

    @Test
    void resetUserPasswordRejectsPasswordsExceeding72Utf8Bytes() {
        String tooLongUtf8 = "ă".repeat(37); // 37 * 2 = 74 UTF-8 bytes

        assertThatThrownBy(() -> adminDashboardService.resetUserPassword(adminId, targetUserId, tooLongUtf8))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST)
                .hasFieldOrPropertyWithValue("code", "PASSWORD_TOO_LONG");

        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).revokeAll(any());
    }

    @Test
    void resetUserPasswordAllowsExactly72Utf8Bytes() {
        String exact72Bytes = "a".repeat(72);
        when(userService.requireById(targetUserId)).thenReturn(targetUser);
        when(passwordEncoder.encode(exact72Bytes)).thenReturn("encoded-72");
        when(userRepository.save(targetUser)).thenReturn(targetUser);

        adminDashboardService.resetUserPassword(adminId, targetUserId, exact72Bytes);

        verify(userRepository).save(targetUser);
        verify(refreshTokenService).revokeAll(targetUser);
    }
}
