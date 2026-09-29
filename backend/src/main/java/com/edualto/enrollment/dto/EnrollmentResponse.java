package com.edualto.enrollment.dto;

import java.time.Instant;
import java.util.UUID;

public record EnrollmentResponse(UUID id, UUID courseId, String courseTitle, String courseSlug,
                                 String courseStatus, String status, Instant enrolledAt) {
}
