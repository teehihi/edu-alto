package com.edualto.profile.dto;

import java.util.UUID;

public record PublicInstructorResponse(
        UUID id,
        String fullName,
        String headline,
        String bio,
        String avatarUrl,
        String xUrl,
        String linkedinUrl,
        String websiteUrl,
        String expertise,
        Integer experienceYears,
        String teachingExperience,
        String specialties
) {
}
