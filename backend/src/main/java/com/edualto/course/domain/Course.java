package com.edualto.course.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    private UUID id;

    @Column(name = "instructor_id", nullable = false)
    private UUID instructorId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(length = 500)
    private String tagline;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "thumbnail_key", length = 512)
    private String thumbnailKey;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "original_price", precision = 12, scale = 2)
    private BigDecimal originalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CourseLevel level = CourseLevel.ALL_LEVELS;

    @Column(nullable = false, length = 20)
    private String language = "vi";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CourseStatus status = CourseStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    protected Course() {
    }

    public Course(
            UUID id,
            UUID instructorId,
            String title,
            String slug,
            String tagline,
            String description,
            BigDecimal price,
            BigDecimal originalPrice,
            CourseLevel level,
            String language,
            String thumbnailKey
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.instructorId = instructorId;
        this.title = title;
        this.slug = slug;
        this.tagline = tagline;
        this.description = description;
        this.price = price != null ? price : BigDecimal.ZERO;
        this.originalPrice = originalPrice;
        this.level = level != null ? level : CourseLevel.ALL_LEVELS;
        this.language = (language != null && !language.isBlank()) ? language : "vi";
        this.thumbnailKey = thumbnailKey;
        this.status = CourseStatus.DRAFT;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (price == null) {
            price = BigDecimal.ZERO;
        }
        if (level == null) {
            level = CourseLevel.ALL_LEVELS;
        }
        if (language == null || language.isBlank()) {
            language = "vi";
        }
        if (status == null) {
            status = CourseStatus.DRAFT;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void update(
            String title,
            String slug,
            String tagline,
            String description,
            BigDecimal price,
            BigDecimal originalPrice,
            CourseLevel level,
            String language,
            String thumbnailKey
    ) {
        if (title != null && !title.isBlank()) {
            this.title = title.trim();
        }
        if (slug != null && !slug.isBlank()) {
            this.slug = slug.trim();
        }
        this.tagline = tagline;
        if (description != null && !description.isBlank()) {
            this.description = description.trim();
        }
        if (price != null) {
            this.price = price;
        }
        this.originalPrice = originalPrice;
        if (level != null) {
            this.level = level;
        }
        if (language != null && !language.isBlank()) {
            this.language = language.trim();
        }
        this.thumbnailKey = thumbnailKey;
    }

    public void publish() {
        this.status = CourseStatus.PUBLISHED;
        if (this.publishedAt == null) {
            this.publishedAt = Instant.now();
        }
    }

    public void archive() {
        this.status = CourseStatus.ARCHIVED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getInstructorId() {
        return instructorId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getTagline() {
        return tagline;
    }

    public void setTagline(String tagline) {
        this.tagline = tagline;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getThumbnailKey() {
        return thumbnailKey;
    }

    public void setThumbnailKey(String thumbnailKey) {
        this.thumbnailKey = thumbnailKey;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getOriginalPrice() {
        return originalPrice;
    }

    public void setOriginalPrice(BigDecimal originalPrice) {
        this.originalPrice = originalPrice;
    }

    public CourseLevel getLevel() {
        return level;
    }

    public void setLevel(CourseLevel level) {
        this.level = level;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public CourseStatus getStatus() {
        return status;
    }

    public void setStatus(CourseStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }
}
