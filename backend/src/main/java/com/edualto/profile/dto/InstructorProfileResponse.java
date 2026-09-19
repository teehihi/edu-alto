package com.edualto.profile.dto;

import com.edualto.profile.domain.InstructorProfile;
import java.time.Instant;

public record InstructorProfileResponse(
        String expertise,
        Integer experienceYears,
        String teachingExperience,
        String qualificationSummary,
        String specialties,
        Instant verifiedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static InstructorProfileResponse from(InstructorProfile profile) {
        if (profile == null) {
            return null;
        }
        return new InstructorProfileResponse(
                profile.getExpertise(),
                profile.getExperienceYears(),
                profile.getTeachingExperience(),
                profile.getQualificationSummary(),
                profile.getSpecialties(),
                profile.getVerifiedAt(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
