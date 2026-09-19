package com.edualto.user.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.dto.UpdateCurrentUserRequest;
import com.edualto.user.dto.UserResponse;
import com.edualto.user.repository.RoleRepository;
import com.edualto.user.repository.UserRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ProfileRepository profileRepository;
    private final StorageService storageService;

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            ProfileRepository profileRepository,
            StorageService storageService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.profileRepository = profileRepository;
        this.storageService = storageService;
    }

    @Transactional
    public User createPendingUser(String fullName, String email, String passwordHash, RoleName roleName) {
        RoleName targetRole = roleName != null ? roleName : RoleName.STUDENT;
        if (targetRole == RoleName.ADMIN) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_ROLE",
                    "Không thể đăng ký tài khoản Quản trị viên"
            );
        }
        if (targetRole != RoleName.STUDENT && targetRole != RoleName.INSTRUCTOR) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_ROLE",
                    "Vai trò đăng ký không hợp lệ"
            );
        }

        String description = targetRole == RoleName.INSTRUCTOR ? "Instructor account" : "Learner account";
        Role role = roleRepository.findByName(targetRole)
                .orElseGet(() -> roleRepository.save(new Role(targetRole, description)));

        User user = new User(fullName, email, passwordHash);
        user.addRole(role);
        return userRepository.save(user);
    }

    @Transactional
    public User createPendingStudent(String fullName, String email, String passwordHash) {
        return createPendingUser(fullName, email, passwordHash, RoleName.STUDENT);
    }

    @Transactional(readOnly = true)
    public User requireById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "Không tìm thấy người dùng"
                ));
    }

    @Transactional(readOnly = true)
    public User requireByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.UNAUTHORIZED,
                        "INVALID_CREDENTIALS",
                        "Email hoặc mật khẩu không đúng"
                ));
    }

    @Transactional(readOnly = true)
    public UserResponse getUserResponse(UUID userId) {
        User user = requireById(userId);
        String avatarUrl = profileRepository.findById(userId)
                .map(Profile::getAvatarKey)
                .filter(key -> key != null && !key.isBlank())
                .map(storageService::getPublicUrl)
                .orElse(null);
        return UserResponse.from(user, avatarUrl);
    }

    @Transactional
    public User updateCurrentUser(UUID userId, UpdateCurrentUserRequest request) {
        User user = requireById(userId);
        user.updateProfile(request.fullName().trim());
        return user;
    }

    @Transactional
    public UserResponse updateCurrentUserResponse(UUID userId, UpdateCurrentUserRequest request) {
        User user = updateCurrentUser(userId, request);
        String avatarUrl = profileRepository.findById(userId)
                .map(Profile::getAvatarKey)
                .filter(key -> key != null && !key.isBlank())
                .map(storageService::getPublicUrl)
                .orElse(null);
        return UserResponse.from(user, avatarUrl);
    }
}
