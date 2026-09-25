package com.edualto.profile.dto;

import com.edualto.profile.domain.InstructorProfile;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.domain.StudentProfile;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String fullName,
        String email,
        UserStatus status,
        List<String> roles,
        String headline,
        String bio,
        String avatarKey,
        String avatarUrl,
        String language,
        String websiteUrl,
        String tiktokUrl,
        String xUrl,
        String linkedinUrl,
        String youtubeUrl,
        String facebookUrl,
        String customHandle,
        StudentProfileResponse studentProfile,
        InstructorProfileResponse instructorProfile,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserProfileResponse from(
            User user,
            Profile profile,
            StudentProfile studentProfile,
            InstructorProfile instructorProfile,
            String avatarUrl
    ) {
        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .map(Enum::name)
                .toList();

        return new UserProfileResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getStatus(),
                roles,
                profile != null ? profile.getHeadline() : null,
                profile != null ? profile.getBio() : null,
                profile != null ? profile.getAvatarKey() : null,
                avatarUrl,
                profile != null ? profile.getLanguage() : "vi",
                profile != null ? profile.getWebsiteUrl() : null,
                profile != null ? profile.getTiktokUrl() : null,
                profile != null ? profile.getXUrl() : null,
                profile != null ? profile.getLinkedinUrl() : null,
                profile != null ? profile.getYoutubeUrl() : null,
                profile != null ? profile.getFacebookUrl() : null,
                profile != null ? profile.getCustomHandle() : null,
                StudentProfileResponse.from(studentProfile),
                InstructorProfileResponse.from(instructorProfile),
                profile != null ? profile.getCreatedAt() : user.getCreatedAt(),
                profile != null ? profile.getUpdatedAt() : user.getUpdatedAt()
        );
    }
}
