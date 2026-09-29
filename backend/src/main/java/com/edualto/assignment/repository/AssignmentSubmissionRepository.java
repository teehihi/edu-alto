package com.edualto.assignment.repository;

import com.edualto.assignment.domain.AssignmentSubmission;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, UUID> {
    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);
    List<AssignmentSubmission> findAllByAssignmentIdOrderBySubmittedAtDesc(UUID assignmentId);
    List<AssignmentSubmission> findAllByAssignmentIdInAndStudentId(List<UUID> assignmentIds, UUID studentId);
}
