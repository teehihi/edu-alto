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
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "learning_goal", columnDefinition = "TEXT")
    private String learningGoal;

    @Column(length = 120)
    private String occupation;

    @Column(name = "education_level", length = 120)
    private String educationLevel;

    @Column(columnDefinition = "TEXT")
    private String interests;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected StudentProfile() {
    }

    public StudentProfile(UUID userId) {
        this.userId = userId;
    }

    public StudentProfile(UUID userId, String learningGoal) {
        this.userId = userId;
        this.learningGoal = learningGoal;
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

    public void update(String learningGoal, String occupation, String educationLevel, String interests) {
        this.learningGoal = learningGoal;
        this.occupation = occupation;
        this.educationLevel = educationLevel;
        this.interests = interests;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getLearningGoal() {
        return learningGoal;
    }

    public void setLearningGoal(String learningGoal) {
        this.learningGoal = learningGoal;
    }

    public String getOccupation() {
        return occupation;
    }

    public String getEducationLevel() {
        return educationLevel;
    }

    public String getInterests() {
        return interests;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
