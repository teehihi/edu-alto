package com.edualto.enrollment.repository;

import com.edualto.enrollment.domain.Enrollment;
import com.edualto.enrollment.domain.EnrollmentStatus;
import com.edualto.enrollment.dto.InstructorCourseStudentResponse;
import com.edualto.enrollment.dto.EnrollmentResponse;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {
    Optional<Enrollment> findByStudentIdAndCourseId(UUID studentId, UUID courseId);

    @Modifying
    @Query(value = """
            insert into enrollments (id, student_id, course_id, status, enrolled_at, created_at, updated_at)
            values (:id, :studentId, :courseId, 'ACTIVE', current_timestamp, current_timestamp, current_timestamp)
            on conflict (student_id, course_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id, @Param("studentId") UUID studentId, @Param("courseId") UUID courseId);

    @Query("""
            select new com.edualto.enrollment.dto.EnrollmentResponse(
                e.id, e.courseId, c.title, c.slug, cast(c.status as string), cast(e.status as string), e.enrolledAt)
            from Enrollment e join Course c on c.id = e.courseId
            where e.studentId = :studentId
            """)
    Page<EnrollmentResponse> findHistory(@Param("studentId") UUID studentId, Pageable pageable);

    @Query("""
            select new com.edualto.enrollment.dto.InstructorCourseStudentResponse(
                u.id, u.fullName, u.email, e.enrolledAt)
            from Enrollment e join User u on u.id = e.studentId
            where e.courseId = :courseId
                and e.status = :status
                and (
                    :search is null
                    or lower(u.fullName) like lower(concat('%', :search, '%'))
                    or lower(u.email) like lower(concat('%', :search, '%'))
                )
            """)
    Page<InstructorCourseStudentResponse> findInstructorCourseStudents(
            @Param("courseId") UUID courseId,
            @Param("status") EnrollmentStatus status,
            @Param("search") String search,
            Pageable pageable
    );
}
