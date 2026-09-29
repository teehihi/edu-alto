package com.edualto.assignment.repository;

import com.edualto.assignment.domain.Assignment;
import com.edualto.assignment.domain.AssignmentStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
    List<Assignment> findAllByCourseIdAndInstructorIdOrderByCreatedAtDesc(UUID courseId, UUID instructorId);
    List<Assignment> findAllByCourseIdInAndStatusOrderByDueAtAsc(List<UUID> courseIds, AssignmentStatus status);
    Optional<Assignment> findByIdAndInstructorId(UUID id, UUID instructorId);

    @Query(value = "select course_id from enrollments where student_id = :studentId and status = 'ACTIVE'", nativeQuery = true)
    List<UUID> findActiveCourseIdsForStudent(@Param("studentId") UUID studentId);

    @Query(value = "select exists(select 1 from enrollments where student_id = :studentId and course_id = :courseId and status = 'ACTIVE')", nativeQuery = true)
    boolean hasActiveEnrollment(@Param("studentId") UUID studentId, @Param("courseId") UUID courseId);
}
