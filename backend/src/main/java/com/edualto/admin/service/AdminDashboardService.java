package com.edualto.admin.service;

import com.edualto.admin.dto.AdminAnalyticsResponse;
import com.edualto.admin.dto.AdminDashboardSummaryResponse;
import com.edualto.admin.dto.AdminUserResponse;
import com.edualto.admin.repository.AdminRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import com.edualto.user.service.UserService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private final AdminRepository adminRepository;
    private final UserService userService;
    private final UserRepository userRepository;

    public AdminDashboardService(
            AdminRepository adminRepository,
            UserService userService,
            UserRepository userRepository
    ) {
        this.adminRepository = adminRepository;
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public AdminDashboardSummaryResponse getDashboardSummary(UUID adminId) {
        userService.requireActiveAdmin(adminId);
        return adminRepository.getDashboardSummary();
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
            }
            userRepository.save(user);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Trạng thái người dùng không hợp lệ");
        }
    }
}
