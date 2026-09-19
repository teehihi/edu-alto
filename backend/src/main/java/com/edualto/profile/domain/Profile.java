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
@Table(name = "profiles")
public class Profile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(length = 255)
    private String headline;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "avatar_key", length = 512)
    private String avatarKey;

    @Column(nullable = false, length = 20)
    private String language = "vi";

    @Column(name = "website_url", length = 512)
    private String websiteUrl;

    @Column(name = "tiktok_url", length = 512)
    private String tiktokUrl;

    @Column(name = "x_url", length = 512)
    private String xUrl;

    @Column(name = "linkedin_url", length = 512)
    private String linkedinUrl;

    @Column(name = "youtube_url", length = 512)
    private String youtubeUrl;

    @Column(name = "facebook_url", length = 512)
    private String facebookUrl;

    @Column(name = "custom_handle", length = 60)
    private String customHandle;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Profile() {
    }

    public Profile(UUID userId) {
        this.userId = userId;
        this.language = "vi";
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public Profile(UUID userId, String headline, String bio, String avatarKey) {
        this.userId = userId;
        this.headline = headline;
        this.bio = bio;
        this.avatarKey = avatarKey;
        this.language = "vi";
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (language == null || language.isBlank()) {
            language = "vi";
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void update(
            String headline,
            String bio,
            String language,
            String websiteUrl,
            String tiktokUrl,
            String xUrl,
            String linkedinUrl,
            String youtubeUrl,
            String facebookUrl,
            String customHandle
    ) {
        this.headline = headline;
        this.bio = bio;
        this.language = (language != null && !language.isBlank()) ? language : "vi";
        this.websiteUrl = websiteUrl;
        this.tiktokUrl = (tiktokUrl != null && !tiktokUrl.isBlank()) ? tiktokUrl : xUrl;
        this.xUrl = this.tiktokUrl;
        this.linkedinUrl = linkedinUrl;
        this.youtubeUrl = youtubeUrl;
        this.facebookUrl = facebookUrl;
        this.customHandle = (customHandle != null && !customHandle.isBlank()) ? customHandle.trim().toLowerCase() : null;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getHeadline() {
        return headline;
    }

    public void setHeadline(String headline) {
        this.headline = headline;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarKey() {
        return avatarKey;
    }

    public void setAvatarKey(String avatarKey) {
        this.avatarKey = avatarKey;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getWebsiteUrl() {
        return websiteUrl;
    }

    public void setWebsiteUrl(String websiteUrl) {
        this.websiteUrl = websiteUrl;
    }

    public String getTiktokUrl() {
        return (tiktokUrl != null && !tiktokUrl.isBlank()) ? tiktokUrl : xUrl;
    }

    public void setTiktokUrl(String tiktokUrl) {
        this.tiktokUrl = tiktokUrl;
        this.xUrl = tiktokUrl;
    }

    public String getXUrl() {
        return xUrl;
    }

    public void setXUrl(String xUrl) {
        this.xUrl = xUrl;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getYoutubeUrl() {
        return youtubeUrl;
    }

    public void setYoutubeUrl(String youtubeUrl) {
        this.youtubeUrl = youtubeUrl;
    }

    public String getFacebookUrl() {
        return facebookUrl;
    }

    public void setFacebookUrl(String facebookUrl) {
        this.facebookUrl = facebookUrl;
    }

    public String getCustomHandle() {
        return customHandle;
    }

    public void setCustomHandle(String customHandle) {
        this.customHandle = (customHandle != null && !customHandle.isBlank()) ? customHandle.trim().toLowerCase() : null;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
