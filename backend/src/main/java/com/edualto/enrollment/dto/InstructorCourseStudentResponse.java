package com.edualto.enrollment.dto;

import java.time.Instant;
import java.util.UUID;

public record InstructorCourseStudentResponse(
        UUID studentId,
        String studentName,
        String email,
        Instant enrolledAt
) {
}
