package com.edualto.course.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class LessonAttachment {
    @Column(name = "id", nullable = false, unique = true)
    private UUID id;

    @Column(name = "object_key", nullable = false, length = 512)
    private String objectKey;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 150)
    private String contentType;

    @Column(name = "content_length", nullable = false)
    private long contentLength;

    @Column(name = "visible_to_students", nullable = false)
    private boolean visibleToStudents = true;

    protected LessonAttachment() {
    }

    public LessonAttachment(UUID id, String objectKey, String fileName, String contentType, long contentLength,
            boolean visibleToStudents) {
        this.id = Objects.requireNonNull(id, "Attachment id must not be null");
        this.objectKey = Objects.requireNonNull(objectKey, "Attachment object key must not be null");
        this.fileName = Objects.requireNonNull(fileName, "Attachment file name must not be null");
        this.contentType = Objects.requireNonNull(contentType, "Attachment content type must not be null");
        this.contentLength = contentLength;
        this.visibleToStudents = visibleToStudents;
    }

    public UUID getId() { return id; }
    public String getObjectKey() { return objectKey; }
    public String getFileName() { return fileName; }
    public String getContentType() { return contentType; }
    public long getContentLength() { return contentLength; }
    public boolean isVisibleToStudents() { return visibleToStudents; }
    public void setVisibleToStudents(boolean visibleToStudents) { this.visibleToStudents = visibleToStudents; }
}
