package com.edualto.profile.dto;

import com.edualto.profile.domain.StudentProfile;
import java.time.Instant;

public record StudentProfileResponse(
        String learningGoal,
        String occupation,
        String educationLevel,
        String interests,
        Instant createdAt,
        Instant updatedAt
) {
    public static StudentProfileResponse from(StudentProfile profile) {
        if (profile == null) {
            return null;
        }
        return new StudentProfileResponse(
                profile.getLearningGoal(),
                profile.getOccupation(),
                profile.getEducationLevel(),
                profile.getInterests(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
