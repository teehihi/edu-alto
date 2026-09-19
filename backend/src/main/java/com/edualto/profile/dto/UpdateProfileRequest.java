package com.edualto.profile.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 160, message = "Họ và tên không được vượt quá 160 ký tự")
        String fullName,

        @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự")
        String headline,

        @Size(max = 5000, message = "Giới thiệu bản thân không được vượt quá 5000 ký tự")
        String bio,

        @Size(max = 20, message = "Ngôn ngữ không hợp lệ")
        String language,

        @Size(max = 512, message = "Đường dẫn website không hợp lệ")
        String websiteUrl,

        @Size(max = 512, message = "Đường dẫn X/Twitter không hợp lệ")
        String xUrl,

        @Size(max = 512, message = "Đường dẫn LinkedIn không hợp lệ")
        String linkedinUrl,

        @Size(max = 512, message = "Đường dẫn YouTube không hợp lệ")
        String youtubeUrl,

        @Size(max = 512, message = "Đường dẫn Facebook không hợp lệ")
        String facebookUrl,

        // Student fields
        String learningGoal,
        @Size(max = 120, message = "Nghề nghiệp không được vượt quá 120 ký tự")
        String occupation,
        @Size(max = 120, message = "Trình độ học vấn không được vượt quá 120 ký tự")
        String educationLevel,
        String interests,

        // Instructor fields
        @Size(max = 255, message = "Chuyên môn không được vượt quá 255 ký tự")
        String expertise,
        Integer experienceYears,
        String teachingExperience,
        String qualificationSummary,
        String specialties
) {
}
