package com.edualto.analytics.repository;

import com.edualto.analytics.dto.InstructorCoursePerformanceDto;
import com.edualto.analytics.dto.InstructorMonthlyTrendDto;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InstructorAnalyticsRepository {

    private static final String MONTHLY_TRENDS_SQL = """
            WITH instructor_courses AS (
                SELECT id FROM courses
                WHERE instructor_id = ?
                __COURSE_FILTER__
            ),
            months AS (
                SELECT generate_series(
                    CAST(? AS TIMESTAMP WITHOUT TIME ZONE),
                    CAST(? AS TIMESTAMP WITHOUT TIME ZONE) - INTERVAL '1 month',
                    INTERVAL '1 month'
                ) AS month_start
            ),
            monthly_enrollments AS (
                SELECT DATE_TRUNC('month', e.enrolled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS month_start,
                       COUNT(DISTINCT e.id) AS new_enrollments
                FROM enrollments e
                JOIN instructor_courses c ON c.id = e.course_id
                WHERE e.status = 'ACTIVE'
                  AND e.enrolled_at >= (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND e.enrolled_at < (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                GROUP BY 1
            ),
            monthly_completions AS (
                SELECT DATE_TRUNC('month', cert.issued_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS month_start,
                       COUNT(DISTINCT cert.id) AS completion_count
                FROM certificates cert
                JOIN instructor_courses c ON c.id = cert.course_id
                WHERE cert.issued_at >= (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND cert.issued_at < (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                GROUP BY 1
            ),
            monthly_revenue AS (
                SELECT DATE_TRUNC('month', o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS month_start,
                       COALESCE(SUM(oi.unit_price), 0) AS revenue_amount
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                JOIN instructor_courses c ON c.id = oi.course_id
                WHERE o.status = 'PAID'
                  AND o.created_at >= (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND o.created_at < (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                GROUP BY 1
            )
            SELECT
                TO_CHAR(m.month_start, 'YYYY-MM') AS month_key,
                TO_CHAR(m.month_start, 'MM/YYYY') AS month_label,
                COALESCE(me.new_enrollments, 0) AS new_enrollments,
                COALESCE(mc.completion_count, 0) AS completed_count,
                COALESCE(mr.revenue_amount, 0) AS revenue_amount
            FROM months m
            LEFT JOIN monthly_enrollments me ON me.month_start = m.month_start
            LEFT JOIN monthly_completions mc ON mc.month_start = m.month_start
            LEFT JOIN monthly_revenue mr ON mr.month_start = m.month_start
            ORDER BY m.month_start ASC
            """;

    private static final String COURSE_PERFORMANCES_SQL = """
            WITH instructor_courses AS (
                SELECT id, title, status, price
                FROM courses
                WHERE instructor_id = ?
                __COURSE_FILTER__
            ),
            lesson_counts AS (
                SELECT s.course_id, COUNT(l.id) AS total_lessons
                FROM sections s
                JOIN lessons l ON l.section_id = s.id
                JOIN instructor_courses c ON c.id = s.course_id
                GROUP BY s.course_id
            ),
            student_counts AS (
                SELECT e.course_id, COUNT(DISTINCT e.student_id) AS student_count
                FROM enrollments e
                JOIN instructor_courses c ON c.id = e.course_id
                WHERE e.status = 'ACTIVE'
                GROUP BY e.course_id
            ),
            completed_lessons AS (
                SELECT lp.course_id, COUNT(lp.id) AS completed_lessons_count
                FROM learning_progress lp
                JOIN instructor_courses c ON c.id = lp.course_id
                GROUP BY lp.course_id
            ),
            certificates_counts AS (
                SELECT cert.course_id, COUNT(DISTINCT cert.id) AS cert_count
                FROM certificates cert
                JOIN instructor_courses c ON c.id = cert.course_id
                GROUP BY cert.course_id
            ),
            revenue_counts AS (
                SELECT oi.course_id, COALESCE(SUM(oi.unit_price), 0) AS total_revenue
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                JOIN instructor_courses c ON c.id = oi.course_id
                WHERE o.status = 'PAID'
                GROUP BY oi.course_id
            ),
            review_stats AS (
                SELECT r.course_id,
                       COUNT(r.id) AS review_count,
                       COALESCE(AVG(r.rating), 5.0) AS avg_rating
                FROM course_reviews r
                JOIN instructor_courses c ON c.id = r.course_id
                WHERE r.status = 'PUBLISHED'
                GROUP BY r.course_id
            )
            SELECT c.id AS course_id,
                   c.title AS course_title,
                   c.status AS course_status,
                   c.price AS price,
                   COALESCE(sc.student_count, 0) AS student_count,
                   COALESCE(cc.cert_count, 0) AS completed_students_count,
                   COALESCE(lc.total_lessons, 0) AS total_lessons,
                   COALESCE(cl.completed_lessons_count, 0) AS completed_lessons_count,
                   COALESCE(rc.total_revenue, 0) AS total_revenue,
                   COALESCE(rs.avg_rating, 5.0) AS average_rating,
                   COALESCE(rs.review_count, 0) AS review_count
            FROM instructor_courses c
            LEFT JOIN lesson_counts lc ON lc.course_id = c.id
            LEFT JOIN student_counts sc ON sc.course_id = c.id
            LEFT JOIN completed_lessons cl ON cl.course_id = c.id
            LEFT JOIN certificates_counts cc ON cc.course_id = c.id
            LEFT JOIN revenue_counts rc ON rc.course_id = c.id
            LEFT JOIN review_stats rs ON rs.course_id = c.id
            ORDER BY c.title ASC
            """;

    private static final String COUNT_STUDENTS_SQL = """
            SELECT COUNT(DISTINCT e.student_id)
            FROM enrollments e
            JOIN courses c ON c.id = e.course_id
            WHERE c.instructor_id = ?
              __COURSE_FILTER__
              AND e.status = 'ACTIVE'
            """;

    private static final String COUNT_COMPLETED_LESSONS_SQL = """
            SELECT COUNT(lp.id)
            FROM learning_progress lp
            JOIN courses c ON c.id = lp.course_id
            WHERE c.instructor_id = ?
              __COURSE_FILTER__
            """;

    private final JdbcTemplate jdbcTemplate;

    public InstructorAnalyticsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean ownsCourse(UUID instructorId, UUID courseId) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM courses WHERE id = ? AND instructor_id = ?)",
                Boolean.class,
                courseId,
                instructorId
        );
        return Boolean.TRUE.equals(exists);
    }

    public List<InstructorMonthlyTrendDto> findMonthlyTrends(
            UUID instructorId,
            UUID courseId,
            LocalDateTime firstMonth,
            LocalDateTime nextMonth
    ) {
        String courseFilter = courseId != null ? " AND id = ?" : "";
        String sql = MONTHLY_TRENDS_SQL.replace("__COURSE_FILTER__", courseFilter);
        List<Object> params = new ArrayList<>();
        params.add(instructorId);
        if (courseId != null) {
            params.add(courseId);
        }
        params.add(firstMonth);
        params.add(nextMonth);
        params.add(firstMonth);
        params.add(nextMonth);
        params.add(firstMonth);
        params.add(nextMonth);
        params.add(firstMonth);
        params.add(nextMonth);

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    long newEnrollments = rs.getLong("new_enrollments");
                    long completedCount = rs.getLong("completed_count");
                    BigDecimal revenue = rs.getBigDecimal("revenue_amount");
                    double completionRate = 0.0;
                    if (newEnrollments > 0) {
                        completionRate = Math.min(100.0, Math.round(((double) completedCount / newEnrollments * 100.0) * 10.0) / 10.0);
                    } else if (completedCount > 0) {
                        completionRate = 100.0;
                    }
                    return new InstructorMonthlyTrendDto(
                            rs.getString("month_key"),
                            rs.getString("month_label"),
                            newEnrollments,
                            completedCount,
                            revenue != null ? revenue : BigDecimal.ZERO,
                            completionRate
                    );
                },
                params.toArray()
        );
    }

    public List<InstructorCoursePerformanceDto> findCoursePerformances(UUID instructorId, UUID courseId) {
        String courseFilter = courseId != null ? " AND id = ?" : "";
        String sql = COURSE_PERFORMANCES_SQL.replace("__COURSE_FILTER__", courseFilter);
        List<Object> params = new ArrayList<>();
        params.add(instructorId);
        if (courseId != null) {
            params.add(courseId);
        }

        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    UUID id = rs.getObject("course_id", UUID.class);
                    String title = rs.getString("course_title");
                    String status = rs.getString("course_status");
                    BigDecimal price = rs.getBigDecimal("price");
                    long studentCount = rs.getLong("student_count");
                    long completedStudents = rs.getLong("completed_students_count");
                    long totalLessons = rs.getLong("total_lessons");
                    long completedLessons = rs.getLong("completed_lessons_count");
                    BigDecimal revenue = rs.getBigDecimal("total_revenue");
                    double avgRating = Math.round(rs.getDouble("average_rating") * 10.0) / 10.0;
                    long reviewCount = rs.getLong("review_count");

                    double completionRate = 0.0;
                    if (totalLessons > 0 && studentCount > 0) {
                        double expectedTotal = (double) (totalLessons * studentCount);
                        completionRate = Math.min(100.0, Math.round(((double) completedLessons / expectedTotal * 100.0) * 10.0) / 10.0);
                    } else if (studentCount > 0 && completedStudents > 0) {
                        completionRate = Math.min(100.0, Math.round(((double) completedStudents / studentCount * 100.0) * 10.0) / 10.0);
                    }

                    return new InstructorCoursePerformanceDto(
                            id,
                            title,
                            status,
                            price != null ? price : BigDecimal.ZERO,
                            studentCount,
                            completedStudents,
                            completionRate,
                            totalLessons,
                            revenue != null ? revenue : BigDecimal.ZERO,
                            avgRating,
                            reviewCount
                    );
                },
                params.toArray()
        );
    }

    public long countDistinctStudents(UUID instructorId, UUID courseId) {
        String courseFilter = courseId != null ? " AND c.id = ?" : "";
        String sql = COUNT_STUDENTS_SQL.replace("__COURSE_FILTER__", courseFilter);
        List<Object> params = new ArrayList<>();
        params.add(instructorId);
        if (courseId != null) {
            params.add(courseId);
        }

        Long count = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                params.toArray()
        );
        return count != null ? count : 0L;
    }

    public long countCompletedLessons(UUID instructorId, UUID courseId) {
        String courseFilter = courseId != null ? " AND c.id = ?" : "";
        String sql = COUNT_COMPLETED_LESSONS_SQL.replace("__COURSE_FILTER__", courseFilter);
        List<Object> params = new ArrayList<>();
        params.add(instructorId);
        if (courseId != null) {
            params.add(courseId);
        }

        Long count = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                params.toArray()
        );
        return count != null ? count : 0L;
    }
}
