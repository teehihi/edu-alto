package com.edualto.analytics.repository;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class StudentLearningAnalyticsRepository {

    public record DailyMetricRow(
            LocalDate activityDate,
            long studySeconds,
            long completedLessons
    ) {
    }

    public record CourseOverviewRow(
            UUID courseId,
            String courseTitle,
            String courseSlug,
            long totalLessons,
            long completedLessons,
            Instant lastActivityAt
    ) {
    }

    public record QuizStatusRow(
            UUID quizId,
            UUID lessonId,
            String lessonTitle,
            String sectionTitle,
            UUID courseId,
            String courseTitle,
            double passingScore,
            Double bestScore,
            Double latestScore,
            Boolean bestPassed,
            int attemptCount,
            Instant lastAttemptAt
    ) {
    }

    public record AssignmentStatusRow(
            UUID assignmentId,
            String title,
            UUID courseId,
            String courseTitle,
            Instant dueAt,
            double maxScore,
            boolean submitted,
            Instant submittedAt,
            Double rawScore,
            Instant gradedAt
    ) {
    }

    public record EnrolledCourseMetaRow(
            boolean courseExists,
            boolean enrolled,
            UUID courseId,
            String courseTitle,
            String courseSlug
    ) {
    }

    private static final String DAILY_METRICS_SQL = """
            WITH active_courses AS (
                SELECT course_id
                FROM enrollments
                WHERE student_id = ?
                  AND status = 'ACTIVE'
            ),
            telemetry_lessons AS (
                SELECT DISTINCT la.student_id, la.lesson_id
                FROM learning_activities la
                JOIN active_courses ac ON ac.course_id = la.course_id
                WHERE la.student_id = ?
                  AND la.lesson_id IS NOT NULL
                  AND (
                      la.activity_type = 'VIDEO_WATCHED'
                      OR (la.activity_type = 'LESSON_VIEWED' AND la.metadata ->> 'reading_time_seconds' IS NOT NULL)
                  )
            ),
            activity_seconds AS (
                SELECT (la.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS activity_date,
                       CASE
                           WHEN la.activity_type = 'VIDEO_WATCHED'
                                AND COALESCE(la.metadata->>'duration_seconds', '') ~ '^[0-9]+(\\.[0-9]+)?$'
                               THEN LEAST((la.metadata->>'duration_seconds')::numeric, 14400)
                           WHEN la.activity_type = 'LESSON_VIEWED'
                                AND COALESCE(la.metadata->>'reading_time_seconds', '') ~ '^[0-9]+(\\.[0-9]+)?$'
                               THEN LEAST((la.metadata->>'reading_time_seconds')::numeric, 14400)
                           WHEN la.activity_type = 'QUIZ_SUBMITTED'
                                AND COALESCE(la.metadata->>'durationSeconds', '') ~ '^[0-9]+(\\.[0-9]+)?$'
                               THEN LEAST((la.metadata->>'durationSeconds')::numeric, 14400)
                           WHEN la.activity_type = 'LESSON_COMPLETED'
                                AND la.lesson_id IS NOT NULL
                                AND NOT EXISTS (
                                    SELECT 1
                                    FROM telemetry_lessons tl
                                    WHERE tl.student_id = la.student_id
                                      AND tl.lesson_id = la.lesson_id
                                )
                                AND COALESCE(la.metadata->>'duration_seconds', '') ~ '^[0-9]+(\\.[0-9]+)?$'
                               THEN LEAST((la.metadata->>'duration_seconds')::numeric, 14400)
                           ELSE 0
                       END AS duration_seconds
                FROM learning_activities la
                JOIN active_courses ac ON ac.course_id = la.course_id
                WHERE la.student_id = ?
                  AND la.occurred_at >= (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND la.occurred_at < (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
            ),
            daily_seconds AS (
                SELECT activity_date,
                       COALESCE(SUM(duration_seconds), 0)::bigint AS study_seconds
                FROM activity_seconds
                GROUP BY activity_date
            ),
            daily_completed AS (
                SELECT (lp.completed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS activity_date,
                       COUNT(DISTINCT lp.id) AS completed_lessons
                FROM learning_progress lp
                JOIN enrollments e ON e.id = lp.enrollment_id
                WHERE e.student_id = ?
                  AND e.status = 'ACTIVE'
                  AND lp.completed_at >= (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND lp.completed_at < (CAST(? AS TIMESTAMP WITHOUT TIME ZONE) AT TIME ZONE 'Asia/Ho_Chi_Minh')
                GROUP BY 1
            ),
            all_dates AS (
                SELECT activity_date FROM daily_seconds
                UNION
                SELECT activity_date FROM daily_completed
            )
            SELECT d.activity_date,
                   COALESCE(ds.study_seconds, 0) AS study_seconds,
                   COALESCE(dc.completed_lessons, 0) AS completed_lessons
            FROM all_dates d
            LEFT JOIN daily_seconds ds ON ds.activity_date = d.activity_date
            LEFT JOIN daily_completed dc ON dc.activity_date = d.activity_date
            ORDER BY d.activity_date ASC
            """;

    private static final String ACTIVE_DATES_DESC_SQL = """
            SELECT DISTINCT activity_date
            FROM (
                SELECT (la.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS activity_date
                FROM learning_activities la
                JOIN enrollments e
                  ON e.student_id = la.student_id
                 AND e.course_id = la.course_id
                 AND e.status = 'ACTIVE'
                WHERE la.student_id = ?
                UNION
                SELECT (lp.completed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS activity_date
                FROM learning_progress lp
                JOIN enrollments e ON e.id = lp.enrollment_id
                WHERE e.student_id = ?
                  AND e.status = 'ACTIVE'
                UNION
                SELECT (qa.submitted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS activity_date
                FROM quiz_attempts qa
                JOIN quizzes q ON q.id = qa.quiz_id
                JOIN lessons l ON l.id = q.lesson_id
                JOIN sections s ON s.id = l.section_id
                JOIN enrollments e
                  ON e.course_id = s.course_id
                 AND e.student_id = qa.student_id
                 AND e.status = 'ACTIVE'
                WHERE qa.student_id = ?
                UNION
                SELECT (asub.submitted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS activity_date
                FROM assignment_submissions asub
                JOIN assignments a ON a.id = asub.assignment_id
                JOIN enrollments e
                  ON e.course_id = a.course_id
                 AND e.student_id = asub.student_id
                 AND e.status = 'ACTIVE'
                WHERE asub.student_id = ?
            ) active_days
            ORDER BY activity_date DESC
            """;

    private static final String ENROLLED_COURSES_SQL = """
            WITH student_enrollments AS (
                SELECT e.id AS enrollment_id,
                       e.course_id,
                       e.enrolled_at,
                       c.title AS course_title,
                       c.slug AS course_slug
                FROM enrollments e
                JOIN courses c ON c.id = e.course_id
                WHERE e.student_id = ?
                  AND e.status = 'ACTIVE'
            ),
            lesson_counts AS (
                SELECT s.course_id, COUNT(l.id) AS total_lessons
                FROM sections s
                JOIN lessons l ON l.section_id = s.id
                JOIN student_enrollments se ON se.course_id = s.course_id
                WHERE l.status = 'PUBLISHED'
                GROUP BY s.course_id
            ),
            completed_counts AS (
                SELECT lp.course_id, COUNT(DISTINCT lp.lesson_id) AS completed_lessons
                FROM learning_progress lp
                JOIN student_enrollments se ON se.enrollment_id = lp.enrollment_id
                JOIN lessons l ON l.id = lp.lesson_id
                WHERE l.status = 'PUBLISHED'
                GROUP BY lp.course_id
            ),
            last_activities AS (
                SELECT course_id, MAX(occurred_at) AS last_occurred_at
                FROM (
                    SELECT la.course_id, la.occurred_at
                    FROM learning_activities la
                    JOIN student_enrollments se ON se.course_id = la.course_id
                    WHERE la.student_id = ?
                    UNION ALL
                    SELECT lp.course_id, lp.completed_at AS occurred_at
                    FROM learning_progress lp
                    JOIN student_enrollments se ON se.enrollment_id = lp.enrollment_id
                ) events
                GROUP BY course_id
            )
            SELECT se.course_id,
                   se.course_title,
                   se.course_slug,
                   COALESCE(lc.total_lessons, 0) AS total_lessons,
                   COALESCE(cc.completed_lessons, 0) AS completed_lessons,
                   GREATEST(la.last_occurred_at, se.enrolled_at) AS last_activity_at
            FROM student_enrollments se
            LEFT JOIN lesson_counts lc ON lc.course_id = se.course_id
            LEFT JOIN completed_counts cc ON cc.course_id = se.course_id
            LEFT JOIN last_activities la ON la.course_id = se.course_id
            ORDER BY se.enrolled_at DESC, se.course_title ASC
            """;

    private static final String QUIZ_STATUS_SQL = """
            WITH student_courses AS (
                SELECT e.course_id, c.title AS course_title
                FROM enrollments e
                JOIN courses c ON c.id = e.course_id
                WHERE e.student_id = ?
                  AND e.status = 'ACTIVE'
                  __COURSE_FILTER__
            ),
            course_quizzes AS (
                SELECT q.id AS quiz_id,
                       l.id AS lesson_id,
                       l.title AS lesson_title,
                       s.title AS section_title,
                       s.position AS section_pos,
                       l.position AS lesson_pos,
                       sc.course_id,
                       sc.course_title,
                       q.passing_score
                FROM quizzes q
                JOIN lessons l ON l.id = q.lesson_id
                JOIN sections s ON s.id = l.section_id
                JOIN student_courses sc ON sc.course_id = s.course_id
                WHERE l.status = 'PUBLISHED'
            ),
            attempt_agg AS (
                SELECT qa.quiz_id,
                       MAX(qa.score) AS best_score,
                       BOOL_OR(qa.passed) AS best_passed,
                       COUNT(*) AS attempt_count,
                       MAX(qa.submitted_at) AS last_attempt_at
                FROM quiz_attempts qa
                JOIN course_quizzes cq ON cq.quiz_id = qa.quiz_id
                WHERE qa.student_id = ?
                GROUP BY qa.quiz_id
            ),
            latest_attempt AS (
                SELECT DISTINCT ON (qa.quiz_id)
                       qa.quiz_id,
                       qa.score AS latest_score
                FROM quiz_attempts qa
                JOIN course_quizzes cq ON cq.quiz_id = qa.quiz_id
                WHERE qa.student_id = ?
                ORDER BY qa.quiz_id, qa.submitted_at DESC
            )
            SELECT cq.quiz_id,
                   cq.lesson_id,
                   cq.lesson_title,
                   cq.section_title,
                   cq.course_id,
                   cq.course_title,
                   cq.passing_score,
                   aa.best_score,
                   la.latest_score,
                   aa.best_passed,
                   COALESCE(aa.attempt_count, 0) AS attempt_count,
                   aa.last_attempt_at
            FROM course_quizzes cq
            LEFT JOIN attempt_agg aa ON aa.quiz_id = cq.quiz_id
            LEFT JOIN latest_attempt la ON la.quiz_id = cq.quiz_id
            ORDER BY cq.course_title ASC, cq.section_pos ASC, cq.lesson_pos ASC
            """;

    private static final String ASSIGNMENT_STATUS_SQL = """
            WITH student_courses AS (
                SELECT e.course_id, c.title AS course_title
                FROM enrollments e
                JOIN courses c ON c.id = e.course_id
                WHERE e.student_id = ?
                  AND e.status = 'ACTIVE'
                  __COURSE_FILTER__
            )
            SELECT a.id AS assignment_id,
                   a.title,
                   sc.course_id,
                   sc.course_title,
                   a.due_at,
                   a.max_score,
                   (asub.id IS NOT NULL) AS submitted,
                   asub.submitted_at,
                   asub.score AS raw_score,
                   asub.graded_at
            FROM assignments a
            JOIN student_courses sc ON sc.course_id = a.course_id
            LEFT JOIN assignment_submissions asub
              ON asub.assignment_id = a.id
             AND asub.student_id = ?
            WHERE a.status = 'PUBLISHED'
            ORDER BY COALESCE(a.due_at, a.created_at) ASC, a.title ASC
            """;

    private static final String COURSE_ACCESS_CHECK_SQL = """
            SELECT c.id AS course_id,
                   c.title AS course_title,
                   c.slug AS course_slug,
                   EXISTS (
                       SELECT 1
                       FROM enrollments e
                       WHERE e.student_id = ?
                         AND e.course_id = c.id
                         AND e.status = 'ACTIVE'
                   ) AS enrolled
            FROM courses c
            WHERE c.id = ?
            """;

    private final JdbcTemplate jdbcTemplate;

    public StudentLearningAnalyticsRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<DailyMetricRow> findDailyMetrics(
            UUID studentId,
            LocalDate fromDateVnInclusive,
            LocalDate toDateVnInclusive
    ) {
        LocalDateTime fromStart = fromDateVnInclusive.atStartOfDay();
        LocalDateTime toExclusive = toDateVnInclusive.plusDays(1).atStartOfDay();
        return jdbcTemplate.query(
                DAILY_METRICS_SQL,
                (rs, rowNum) -> {
                    Date dateValue = rs.getDate("activity_date");
                    return new DailyMetricRow(
                            dateValue.toLocalDate(),
                            rs.getLong("study_seconds"),
                            rs.getLong("completed_lessons")
                    );
                },
                studentId,
                studentId,
                studentId,
                fromStart,
                toExclusive,
                studentId,
                fromStart,
                toExclusive
        );
    }

    public List<LocalDate> findActiveDatesDesc(UUID studentId) {
        return jdbcTemplate.query(
                ACTIVE_DATES_DESC_SQL,
                (rs, rowNum) -> rs.getDate("activity_date").toLocalDate(),
                studentId,
                studentId,
                studentId,
                studentId
        );
    }

    public List<CourseOverviewRow> findEnrolledCourses(UUID studentId) {
        return jdbcTemplate.query(
                ENROLLED_COURSES_SQL,
                (rs, rowNum) -> new CourseOverviewRow(
                        rs.getObject("course_id", UUID.class),
                        rs.getString("course_title"),
                        rs.getString("course_slug"),
                        rs.getLong("total_lessons"),
                        rs.getLong("completed_lessons"),
                        toInstant(rs.getTimestamp("last_activity_at"))
                ),
                studentId,
                studentId
        );
    }

    public List<QuizStatusRow> findQuizStatuses(UUID studentId, UUID courseId) {
        String filterClause = courseId == null ? "" : " AND e.course_id = ? ";
        String sql = QUIZ_STATUS_SQL.replace("__COURSE_FILTER__", filterClause);
        Object[] params = courseId == null
                ? new Object[]{studentId, studentId, studentId}
                : new Object[]{studentId, courseId, studentId, studentId};
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new QuizStatusRow(
                        rs.getObject("quiz_id", UUID.class),
                        rs.getObject("lesson_id", UUID.class),
                        rs.getString("lesson_title"),
                        rs.getString("section_title"),
                        rs.getObject("course_id", UUID.class),
                        rs.getString("course_title"),
                        rs.getDouble("passing_score"),
                        toNullableDouble(rs.getObject("best_score")),
                        toNullableDouble(rs.getObject("latest_score")),
                        toNullableBoolean(rs.getObject("best_passed")),
                        rs.getInt("attempt_count"),
                        toInstant(rs.getTimestamp("last_attempt_at"))
                ),
                params
        );
    }

    public List<AssignmentStatusRow> findAssignmentStatuses(UUID studentId, UUID courseId) {
        String filterClause = courseId == null ? "" : " AND e.course_id = ? ";
        String sql = ASSIGNMENT_STATUS_SQL.replace("__COURSE_FILTER__", filterClause);
        Object[] params = courseId == null
                ? new Object[]{studentId, studentId}
                : new Object[]{studentId, courseId, studentId};
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new AssignmentStatusRow(
                        rs.getObject("assignment_id", UUID.class),
                        rs.getString("title"),
                        rs.getObject("course_id", UUID.class),
                        rs.getString("course_title"),
                        toInstant(rs.getTimestamp("due_at")),
                        rs.getDouble("max_score"),
                        rs.getBoolean("submitted"),
                        toInstant(rs.getTimestamp("submitted_at")),
                        toNullableDouble(rs.getObject("raw_score")),
                        toInstant(rs.getTimestamp("graded_at"))
                ),
                params
        );
    }

    public EnrolledCourseMetaRow checkCourseAccess(UUID studentId, UUID courseId) {
        List<EnrolledCourseMetaRow> rows = jdbcTemplate.query(
                COURSE_ACCESS_CHECK_SQL,
                (rs, rowNum) -> new EnrolledCourseMetaRow(
                        true,
                        rs.getBoolean("enrolled"),
                        rs.getObject("course_id", UUID.class),
                        rs.getString("course_title"),
                        rs.getString("course_slug")
                ),
                studentId,
                courseId
        );
        if (rows.isEmpty()) {
            return new EnrolledCourseMetaRow(false, false, courseId, null, null);
        }
        return rows.get(0);
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp != null ? timestamp.toInstant() : null;
    }

    private Double toNullableDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private Boolean toNullableBoolean(Object value) {
        return value instanceof Boolean bool ? bool : null;
    }
}
