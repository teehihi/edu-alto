package com.edualto.review.repository;

import com.edualto.review.domain.CourseReview;
import com.edualto.review.domain.ReviewStatus;
import com.edualto.review.dto.CourseReviewResponse;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CourseReviewRepository extends JpaRepository<CourseReview, UUID> {
    Optional<CourseReview> findByStudentIdAndCourseId(UUID studentId, UUID courseId);

    @Modifying
    @Query(value = """
            insert into course_reviews (id, student_id, course_id, rating, comment, status, created_at, updated_at)
            values (:id, :studentId, :courseId, :rating, :comment, 'PUBLISHED', current_timestamp, current_timestamp)
            on conflict (student_id, course_id) do update
            set rating = excluded.rating, comment = excluded.comment, status = 'PUBLISHED', updated_at = current_timestamp
            """, nativeQuery = true)
    int upsertReview(
            @Param("id") UUID id,
            @Param("studentId") UUID studentId,
            @Param("courseId") UUID courseId,
            @Param("rating") int rating,
            @Param("comment") String comment
    );

    @Query("""
            select new com.edualto.review.dto.CourseReviewResponse(
                r.id, r.courseId, r.studentId, u.fullName, r.rating, r.comment,
                cast(r.status as string), r.createdAt, r.updatedAt)
            from CourseReview r join User u on u.id = r.studentId
            where r.courseId = :courseId and r.status = :status
            """)
    Page<CourseReviewResponse> findPublicReviews(
            @Param("courseId") UUID courseId,
            @Param("status") ReviewStatus status,
            Pageable pageable
    );

    @Query("select avg(r.rating) from CourseReview r where r.courseId = :courseId and r.status = :status")
    BigDecimal getAverageRating(@Param("courseId") UUID courseId, @Param("status") ReviewStatus status);

    long countByCourseIdAndStatus(UUID courseId, ReviewStatus status);
}
