package com.edualto.ai.repository;

import com.edualto.ai.domain.CurriculumImportJob;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CurriculumImportJobRepository extends JpaRepository<CurriculumImportJob, UUID> {

    Optional<CurriculumImportJob> findByIdAndCourseIdAndInstructorId(UUID id, UUID courseId, UUID instructorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from CurriculumImportJob job where job.id = :id and job.courseId = :courseId and job.instructorId = :instructorId")
    Optional<CurriculumImportJob> findOwnedForUpdate(
            @Param("id") UUID id,
            @Param("courseId") UUID courseId,
            @Param("instructorId") UUID instructorId
    );

    @Modifying
    @Query("update CurriculumImportJob job set job.status = :failed, job.message = :message, job.updatedAt = :now where job.status = :queued or job.status = :processing")
    int recoverInterruptedJobs(
            @Param("failed") CurriculumImportJob.Status failed,
            @Param("queued") CurriculumImportJob.Status queued,
            @Param("processing") CurriculumImportJob.Status processing,
            @Param("message") String message,
            @Param("now") Instant now
    );
}
