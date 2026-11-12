package com.edualto.support.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contact_messages")
public class ContactMessage {

    @Id
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ContactMessageStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ContactMessage() {
    }

    public ContactMessage(String fullName, String email, String message) {
        this.id = UUID.randomUUID();
        this.fullName = fullName;
        this.email = email;
        this.message = message;
        this.status = ContactMessageStatus.NEW;
    }

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (status == null) {
            status = ContactMessageStatus.NEW;
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getMessage() {
        return message;
    }

    public ContactMessageStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
