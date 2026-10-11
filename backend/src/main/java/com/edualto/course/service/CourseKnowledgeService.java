package com.edualto.course.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.dto.CourseKnowledgePassageDto;
import com.edualto.course.repository.CourseKnowledgeRepository;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CourseKnowledgeService {
    private final CourseKnowledgeRepository repository;
    private final UserRepository users;

    public CourseKnowledgeService(CourseKnowledgeRepository repository, UserRepository users) {
        this.repository = repository;
        this.users = users;
    }

    public List<CourseKnowledgePassageDto> retrieve(UUID userId, UUID courseId, String question) {
        User user = users.findById(userId).orElseThrow(CourseKnowledgeService::forbidden);
        if (user.getStatus() != UserStatus.ACTIVE || user.getEmailVerifiedAt() == null) throw forbidden();
        boolean canViewOwned = user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.INSTRUCTOR
                || role.getName() == RoleName.ADMIN);
        return repository.retrieve(userId, canViewOwned, courseId, question);
    }

    private static BusinessException forbidden() {
        return new BusinessException(HttpStatus.FORBIDDEN, "AI_ACCOUNT_INACTIVE",
                "Vui lòng xác minh email và sử dụng tài khoản đang hoạt động.");
    }
}
