package com.edualto.course.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "sections")
public class Section {

    @Id
    private UUID id;

    @Column(name = "course_id", nullable = false)
    private UUID courseId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "introduction", columnDefinition = "text")
    private String introduction;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "meta_title", length = 255)
    private String metaTitle;

    @Column(name = "meta_description", length = 500)
    private String metaDescription;

    @Column(name = "position", nullable = false)
    private Integer position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Section() {
    }

    public Section(UUID id, UUID courseId, String title, String description, Integer position) {
        this(id, courseId, title, null, description, null, null, position);
    }

    public Section(
            UUID id,
            UUID courseId,
            String title,
            String introduction,
            String description,
            String metaTitle,
            String metaDescription,
            Integer position
    ) {
        this.id = Objects.requireNonNull(id, "Section id must not be null");
        this.courseId = Objects.requireNonNull(courseId, "Course id must not be null");
        this.title = Objects.requireNonNull(title, "Section title must not be null").trim();
        this.introduction = trimToNull(introduction);
        this.description = trimToNull(description);
        this.metaTitle = trimToNull(metaTitle);
        this.metaDescription = trimToNull(metaDescription);
        this.position = Objects.requireNonNull(position, "Section position must not be null");
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public static Section create(UUID courseId, String title, String description, int position) {
        return new Section(UUID.randomUUID(), courseId, title, description, position);
    }

    public static Section create(
            UUID courseId,
            String title,
            String introduction,
            String description,
            String metaTitle,
            String metaDescription,
            int position
    ) {
        return new Section(
                UUID.randomUUID(),
                courseId,
                title,
                introduction,
                description,
                metaTitle,
                metaDescription,
                position
        );
    }

    public void update(String title, String description) {
        update(title, null, description, null, null);
    }

    public void update(
            String title,
            String introduction,
            String description,
            String metaTitle,
            String metaDescription
    ) {
        this.title = Objects.requireNonNull(title, "Section title must not be null").trim();
        this.introduction = trimToNull(introduction);
        this.description = trimToNull(description);
        this.metaTitle = trimToNull(metaTitle);
        this.metaDescription = trimToNull(metaDescription);
        this.updatedAt = Instant.now();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    public void updatePosition(int newPosition) {
        if (newPosition < 1) {
            throw new IllegalArgumentException("Position must be greater than or equal to 1");
        }
        this.position = newPosition;
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCourseId() {
        return courseId;
    }

    public String getTitle() {
        return title;
    }

    public String getIntroduction() {
        return introduction;
    }

    public String getDescription() {
        return description;
    }

    public String getMetaTitle() {
        return metaTitle;
    }

    public String getMetaDescription() {
        return metaDescription;
    }

    public Integer getPosition() {
        return position;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
