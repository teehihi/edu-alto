package com.edualto.admin.service;

import com.edualto.admin.dto.AdminAnalyticsResponse;
import com.edualto.admin.dto.AdminDashboardSummaryResponse;
import com.edualto.admin.dto.AdminUserResponse;
import com.edualto.admin.dto.CreateAdminUserRequest;
import com.edualto.admin.repository.AdminRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import com.edualto.user.service.UserService;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private final AdminRepository adminRepository;
    private final UserService userService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminDashboardService(
            AdminRepository adminRepository,
            UserService userService,
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.adminRepository = adminRepository;
        this.userService = userService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public AdminDashboardSummaryResponse getDashboardSummary(UUID adminId) {
        return getDashboardSummary(adminId, "30days");
    }

    @Transactional(readOnly = true)
    public AdminDashboardSummaryResponse getDashboardSummary(UUID adminId, String timeRange) {
        userService.requireActiveAdmin(adminId);
        return adminRepository.getDashboardSummary(timeRange);
    }

    @Transactional(readOnly = true)
    public Page<AdminUserResponse> listUsers(UUID adminId, int page, int size, String keyword, String role) {
        userService.requireActiveAdmin(adminId);
        return adminRepository.listUsers(page, size, keyword, role);
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse getAnalytics(UUID adminId) {
        userService.requireActiveAdmin(adminId);
        return adminRepository.getAnalytics();
    }

    @Transactional
    public void updateUserRoles(UUID adminId, UUID targetUserId, List<String> roleNames) {
        userService.requireActiveAdmin(adminId);
        User targetUser = userService.requireById(targetUserId);

        if (roleNames == null || roleNames.isEmpty()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "ROLES_REQUIRED", "Người dùng phải có ít nhất một vai trò");
        }

        Set<Role> resolvedRoles = new LinkedHashSet<>();
        boolean containsAdmin = false;
        for (String r : roleNames) {
            try {
                RoleName rn = RoleName.valueOf(r.trim().toUpperCase());
                Role role = roleRepository.findByName(rn)
                        .orElseGet(() -> roleRepository.save(new Role(rn, rn.name() + " role")));
                resolvedRoles.add(role);
                if (rn == RoleName.ADMIN) {
                    containsAdmin = true;
                }
            } catch (IllegalArgumentException e) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Vai trò không hợp lệ: " + r);
            }
        }

        if (adminId.equals(targetUserId) && !containsAdmin) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "CANNOT_DEMOTE_SELF",
                    "Không thể tự thu hồi quyền Quản trị viên (Admin) của chính mình"
            );
        }

        targetUser.setRoles(resolvedRoles);
        userRepository.save(targetUser);
    }

    @Transactional
    public void updateUserStatus(UUID adminId, UUID targetUserId, String status) {
        userService.requireActiveAdmin(adminId);
        if (adminId.equals(targetUserId)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "CANNOT_MODIFY_SELF", "Không thể tự thay đổi trạng thái của chính mình");
        }

        User user = userService.requireById(targetUserId);
        try {
            UserStatus newStatus = UserStatus.valueOf(status.trim().toUpperCase());
            if (newStatus == UserStatus.ACTIVE) {
                user.activate();
            } else {
                user.setStatus(newStatus);
            }
            userRepository.save(user);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Trạng thái người dùng không hợp lệ");
        }
    }

    @Transactional
    public AdminUserResponse createUser(UUID adminId, CreateAdminUserRequest request) {
        userService.requireActiveAdmin(adminId);
        String email = request.email().trim().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            throw new BusinessException(HttpStatus.CONFLICT, "EMAIL_EXISTS", "Email này đã được sử dụng trên hệ thống");
        }

        User user = new User(
                request.fullName().trim(),
                email,
                passwordEncoder.encode(request.password().trim())
        );
        user.activate();

        List<String> roleNames = request.roles();
        if (roleNames == null || roleNames.isEmpty()) {
            roleNames = List.of("STUDENT");
        }

        Set<Role> resolvedRoles = new LinkedHashSet<>();
        List<String> assignedRoleNames = new ArrayList<>();
        for (String r : roleNames) {
            try {
                RoleName rn = RoleName.valueOf(r.trim().toUpperCase());
                Role role = roleRepository.findByName(rn)
                        .orElseGet(() -> roleRepository.save(new Role(rn, rn.name() + " role")));
                resolvedRoles.add(role);
                assignedRoleNames.add(rn.name());
            } catch (IllegalArgumentException e) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Vai trò không hợp lệ: " + r);
            }
        }

        user.setRoles(resolvedRoles);
        User saved = userRepository.save(user);

        return new AdminUserResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getStatus().name(),
                assignedRoleNames,
                saved.getCreatedAt(),
                0L,
                0L,
                null
        );
    }

    @Transactional
    public void resetUserPassword(UUID adminId, UUID targetUserId, String newPassword) {
        userService.requireActiveAdmin(adminId);
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Mật khẩu mới phải có ít nhất 6 ký tự");
        }

        User user = userService.requireById(targetUserId);
        user.changePassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
    }
}
