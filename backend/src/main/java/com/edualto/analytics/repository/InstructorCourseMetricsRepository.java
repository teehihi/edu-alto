package com.edualto.analytics.repository;

import com.edualto.analytics.dto.InstructorCourseMetricsResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InstructorCourseMetricsRepository {

    private static final String FIND_BY_INSTRUCTOR_SQL = """
            with instructor_courses as (
                select id
                from courses
                where instructor_id = ?
            ),
            chapter_counts as (
                select s.course_id, count(*) as chapter_count
                from sections s
                join instructor_courses c on c.id = s.course_id
                group by s.course_id
            ),
            review_counts as (
                select r.course_id, count(*) as public_review_count
                from course_reviews r
                join instructor_courses c on c.id = r.course_id
                where r.status = 'PUBLISHED'
                group by r.course_id
            ),
            sales_counts as (
                select oi.course_id, count(distinct o.id) as paid_order_count
                from order_items oi
                join instructor_courses c on c.id = oi.course_id
                join orders o on o.id = oi.order_id and o.status = 'PAID'
                group by oi.course_id
            ),
            enrollment_counts as (
                select e.course_id, count(*) as active_enrollment_count
                from enrollments e
                join instructor_courses c on c.id = e.course_id
                where e.status = 'ACTIVE'
                group by e.course_id
            ),
            wishlist_counts as (
                select w.course_id, count(*) as wishlist_count
                from course_wishlists w
                join instructor_courses c on c.id = w.course_id
                group by w.course_id
            ),
            certificate_counts as (
                select issued.course_id, count(*) as certificate_count
                from certificates issued
                join instructor_courses c on c.id = issued.course_id
                group by issued.course_id
            )
            select c.id as course_id,
                   coalesce(ch.chapter_count, 0) as chapter_count,
                   coalesce(rv.public_review_count, 0) as public_review_count,
                   coalesce(sa.paid_order_count, 0) as paid_order_count,
                   coalesce(en.active_enrollment_count, 0) as active_enrollment_count,
                   coalesce(wl.wishlist_count, 0) as wishlist_count,
                   coalesce(cc.certificate_count, 0) as certificate_count
            from instructor_courses c
            left join chapter_counts ch on ch.course_id = c.id
            left join review_counts rv on rv.course_id = c.id
            left join sales_counts sa on sa.course_id = c.id
            left join enrollment_counts en on en.course_id = c.id
            left join wishlist_counts wl on wl.course_id = c.id
            left join certificate_counts cc on cc.course_id = c.id
            order by c.id
            """;

    private final JdbcTemplate jdbcTemplate;

    public InstructorCourseMetricsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<InstructorCourseMetricsResponse> findByInstructorId(UUID instructorId) {
        return jdbcTemplate.query(
                FIND_BY_INSTRUCTOR_SQL,
                (resultSet, rowNumber) -> new InstructorCourseMetricsResponse(
                        resultSet.getObject("course_id", UUID.class),
                        resultSet.getLong("chapter_count"),
                        resultSet.getLong("public_review_count"),
                        resultSet.getLong("paid_order_count"),
                        resultSet.getLong("active_enrollment_count"),
                        resultSet.getLong("wishlist_count"),
                        resultSet.getLong("certificate_count")
                ),
                instructorId
        );
    }
}
