package com.edualto.user.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.dto.UpdateCurrentUserRequest;
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

    public UserService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional
    public User createPendingStudent(String fullName, String email, String passwordHash) {
        Role studentRole = roleRepository.findByName(RoleName.STUDENT)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.STUDENT, "Learner account")));

        User user = new User(fullName, email, passwordHash);
        user.addRole(studentRole);
        return userRepository.save(user);
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

    @Transactional
    public User updateCurrentUser(UUID userId, UpdateCurrentUserRequest request) {
        User user = requireById(userId);
        user.updateProfile(request.fullName().trim());
        return user;
    }
}
