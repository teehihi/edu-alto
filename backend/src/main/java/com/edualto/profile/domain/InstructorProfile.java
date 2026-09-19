package com.edualto.profile.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "instructor_profiles")
public class InstructorProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 255)
    private String expertise;

    @Column(name = "experience_years")
    private Integer experienceYears;

    @Column(name = "teaching_experience", columnDefinition = "TEXT")
    private String teachingExperience;

    @Column(name = "qualification_summary", columnDefinition = "TEXT")
    private String qualificationSummary;

    @Column(columnDefinition = "TEXT")
    private String specialties;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected InstructorProfile() {
    }

    public InstructorProfile(UUID userId, String expertise) {
        this.userId = userId;
        this.expertise = expertise;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void update(
            String expertise,
            Integer experienceYears,
            String teachingExperience,
            String qualificationSummary,
            String specialties
    ) {
        if (expertise != null && !expertise.isBlank()) {
            this.expertise = expertise;
        }
        this.experienceYears = experienceYears;
        this.teachingExperience = teachingExperience;
        this.qualificationSummary = qualificationSummary;
        this.specialties = specialties;
    }

    public void verify() {
        this.verifiedAt = Instant.now();
    }

    public UUID getUserId() {
        return userId;
    }

    public String getExpertise() {
        return expertise;
    }

    public Integer getExperienceYears() {
        return experienceYears;
    }

    public String getTeachingExperience() {
        return teachingExperience;
    }

    public String getQualificationSummary() {
        return qualificationSummary;
    }

    public String getSpecialties() {
        return specialties;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
