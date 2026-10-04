package com.edualto.profile.dto;

import java.util.List;
import java.util.UUID;

public record PublicProfileResponse(
        UUID id,
        String fullName,
        List<String> roles,
        String headline,
        String bio,
        String avatarUrl,
        String language,
        String websiteUrl,
        String tiktokUrl,
        String xUrl,
        String linkedinUrl,
        String youtubeUrl,
        String facebookUrl,
        String customHandle,
        StudentResponse studentProfile,
        InstructorResponse instructorProfile
) {
    public static PublicProfileResponse from(UserProfileResponse profile) {
        StudentProfileResponse student = profile.studentProfile();
        InstructorProfileResponse instructor = profile.instructorProfile();
        return new PublicProfileResponse(profile.id(), profile.fullName(), profile.roles(), profile.headline(),
                profile.bio(), profile.avatarUrl(), profile.language(), profile.websiteUrl(), profile.tiktokUrl(),
                profile.xUrl(), profile.linkedinUrl(), profile.youtubeUrl(), profile.facebookUrl(), profile.customHandle(),
                student == null ? null : new StudentResponse(student.learningGoal(), student.occupation(), student.educationLevel(), student.interests()),
                instructor == null ? null : new InstructorResponse(instructor.expertise(), instructor.experienceYears(),
                        instructor.teachingExperience(), instructor.qualificationSummary(), instructor.specialties()));
    }

    public record StudentResponse(String learningGoal, String occupation, String educationLevel, String interests) { }

    public record InstructorResponse(String expertise, Integer experienceYears, String teachingExperience,
            String qualificationSummary, String specialties) { }
}
