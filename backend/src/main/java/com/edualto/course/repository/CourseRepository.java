package com.edualto.course.repository;

import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID>, JpaSpecificationExecutor<Course> {

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select c from Course c where c.id = :courseId")
    Optional<Course> findForEnrollment(@Param("courseId") UUID courseId);

    Optional<Course> findBySlugAndStatus(String slug, CourseStatus status);

    Optional<Course> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    Page<Course> findAllByInstructorId(UUID instructorId, Pageable pageable);

    Page<Course> findAllByInstructorIdAndStatus(UUID instructorId, CourseStatus status, Pageable pageable);

    Optional<Course> findByIdAndInstructorId(UUID id, UUID instructorId);
}
