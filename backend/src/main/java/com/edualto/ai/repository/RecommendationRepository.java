package com.edualto.ai.repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Repository
public class RecommendationRepository {

    public record CandidateCourseRow(
            UUID id,
            UUID instructorId,
            String title,
            String slug,
            String tagline,
            String description,
            String thumbnailKey,
            BigDecimal price,
            BigDecimal originalPrice,
            String level,
            String language,
            String status,
            Instant publishedAt,
            String instructorName,
            String instructorAvatarKey,
            String instructorHeadline,
            String instructorCustomHandle,
            long enrollmentCount,
            double averageRating,
            long reviewCount
    ) {
    }

    public record StudentPreferencesRow(
            List<String> preferredTopics,
            String preferredLevel,
            String learningGoal,
            Integer weeklyTargetHours,
            boolean personalizationEnabled,
            boolean onboardingCompleted
    ) {
    }

    public record SignalCourseRow(
            UUID courseId,
            String title,
            String tagline,
            String description,
            String level,
            double totalWeight,
            Instant latestAt
    ) {
    }

    public record WeakQuizTopicRow(
            UUID quizId,
            UUID lessonId,
            String lessonTitle,
            String sectionTitle,
            UUID courseId,
            String courseTitle,
            String courseSlug,
            double passingScore,
            Double bestScore,
            int attemptCount,
            Integer durationSeconds
    ) {
    }

    public record NextLessonCandidateRow(
            UUID courseId,
            String courseTitle,
            String courseSlug,
            UUID lessonId,
            String lessonTitle,
            String lessonType,
            String sectionTitle,
            Integer durationSeconds,
            long completedLessons,
            long totalLessons,
            Instant lastActivityAt,
            boolean hasQuizAttempt,
            Boolean bestQuizPassed
    ) {
    }

    public record CachedSnapshotHeader(
            UUID snapshotId,
            String algorithmVersion,
            Instant generatedAt,
            Instant expiresAt
    ) {
    }

    public record CachedSnapshotItemRow(
            UUID itemId,
            String itemType,
            UUID targetId,
            UUID courseId,
            UUID lessonId,
            int rankPosition,
            double score,
            String tier,
            String reasonCode,
            String reasonText,
            Integer estimatedMinutes,
            String targetUrl
    ) {
    }

    public record SnapshotItemWriteRow(
            UUID id,
            String itemType,
            UUID targetId,
            UUID courseId,
            UUID lessonId,
            int rankPosition,
            double score,
            String tier,
            String reasonCode,
            String reasonText,
            Integer estimatedMinutes,
            String targetUrl
    ) {
    }

    private static final String PUBLISHED_COURSES_SQL = """
            WITH enroll_stats AS (
                SELECT course_id, COUNT(*) AS enrollment_count
                FROM enrollments
                WHERE status = 'ACTIVE'
                GROUP BY course_id
            ),
            review_stats AS (
                SELECT course_id,
                       COALESCE(AVG(rating), 0)::double precision AS avg_rating,
                       COUNT(*) AS review_count
                FROM course_reviews
                WHERE status = 'PUBLISHED'
                GROUP BY course_id
            )
            SELECT c.id,
                   c.instructor_id,
                   c.title,
                   c.slug,
                   c.tagline,
                   c.description,
                   c.thumbnail_key,
                   c.price,
                   c.original_price,
                   c.level,
                   c.language,
                   c.status,
                   c.published_at,
                   u.full_name AS instructor_name,
                   p.avatar_key AS instructor_avatar_key,
                   p.headline AS instructor_headline,
                   p.custom_handle AS instructor_custom_handle,
                   COALESCE(es.enrollment_count, 0) AS enrollment_count,
                   COALESCE(rs.avg_rating, 0) AS average_rating,
                   COALESCE(rs.review_count, 0) AS review_count
            FROM courses c
            JOIN users u ON u.id = c.instructor_id
            LEFT JOIN profiles p ON p.user_id = u.id
            LEFT JOIN enroll_stats es ON es.course_id = c.id
            LEFT JOIN review_stats rs ON rs.course_id = c.id
            WHERE c.status = 'PUBLISHED'
            ORDER BY COALESCE(es.enrollment_count, 0) DESC, c.published_at DESC NULLS LAST
            LIMIT ?
            """;

    private static final String POSITIVE_USER_SIGNAL_COURSES_SQL = """
            WITH raw_signals AS (
                SELECT e.course_id, 4.0::double precision AS weight, e.enrolled_at AS occurred_at
                FROM enrollments e
                WHERE e.student_id = ?
                  AND e.status = 'ACTIVE'
                UNION ALL
                SELECT cw.course_id, 3.0::double precision AS weight, cw.created_at AS occurred_at
                FROM course_wishlists cw
                WHERE cw.user_id = ?
                UNION ALL
                SELECT ls.course_id, ls.signal_weight AS weight, ls.occurred_at
                FROM learning_signals ls
                WHERE ls.user_id = ?
                  AND ls.course_id IS NOT NULL
                  AND ls.signal_type IN ('COURSE_VIEWED', 'COURSE_WISHLISTED', 'COURSE_ENROLLED', 'LESSON_COMPLETED', 'RECOMMENDATION_CLICKED')
            )
            SELECT c.id AS course_id,
                   c.title,
                   c.tagline,
                   c.description,
                   c.level,
                   SUM(rs.weight) AS total_weight,
                   MAX(rs.occurred_at) AS latest_at
            FROM raw_signals rs
            JOIN courses c ON c.id = rs.course_id
            GROUP BY c.id, c.title, c.tagline, c.description, c.level
            ORDER BY total_weight DESC, latest_at DESC
            LIMIT 25
            """;

    private static final String WEAK_QUIZ_TOPICS_SQL = """
            WITH attempt_summary AS (
                SELECT qa.quiz_id,
                       MAX(qa.score)::double precision AS best_score,
                       BOOL_OR(qa.passed) AS best_passed,
                       COUNT(*) AS attempt_count
                FROM quiz_attempts qa
                WHERE qa.student_id = ?
                GROUP BY qa.quiz_id
            )
            SELECT q.id AS quiz_id,
                   l.id AS lesson_id,
                   l.title AS lesson_title,
                   s.title AS section_title,
                   c.id AS course_id,
                   c.title AS course_title,
                   c.slug AS course_slug,
                   q.passing_score::double precision AS passing_score,
                   asum.best_score,
                   asum.attempt_count,
                   l.duration_seconds
            FROM attempt_summary asum
            JOIN quizzes q ON q.id = asum.quiz_id
            JOIN lessons l ON l.id = q.lesson_id
            JOIN sections s ON s.id = l.section_id
            JOIN courses c ON c.id = s.course_id
            JOIN enrollments e ON e.course_id = c.id AND e.student_id = ? AND e.status = 'ACTIVE'
            WHERE c.status = 'PUBLISHED'
              AND l.status = 'PUBLISHED'
              AND (asum.best_passed = FALSE OR asum.best_score < 70.0)
            ORDER BY asum.best_score ASC, asum.attempt_count DESC
            LIMIT 10
            """;

    private static final String NEXT_LESSON_CANDIDATES_SQL = """
            WITH active_enrollments AS (
                SELECT e.id AS enrollment_id,
                       e.course_id,
                       e.enrolled_at,
                       c.title AS course_title,
                       c.slug AS course_slug
                FROM enrollments e
                JOIN courses c ON c.id = e.course_id
                WHERE e.student_id = ?
                  AND e.status = 'ACTIVE'
                  AND c.status = 'PUBLISHED'
            ),
            course_lesson_totals AS (
                SELECT s.course_id, COUNT(l.id) AS total_lessons
                FROM sections s
                JOIN lessons l ON l.section_id = s.id
                JOIN active_enrollments ae ON ae.course_id = s.course_id
                WHERE l.status = 'PUBLISHED'
                GROUP BY s.course_id
            ),
            course_completed_totals AS (
                SELECT lp.course_id, COUNT(DISTINCT lp.lesson_id) AS completed_lessons, MAX(lp.completed_at) AS last_completed_at
                FROM learning_progress lp
                JOIN active_enrollments ae ON ae.enrollment_id = lp.enrollment_id
                JOIN lessons l ON l.id = lp.lesson_id
                WHERE l.status = 'PUBLISHED'
                GROUP BY lp.course_id
            ),
            last_course_activity AS (
                SELECT ae.course_id,
                       GREATEST(
                           ae.enrolled_at,
                           cct.last_completed_at,
                           (SELECT MAX(la.occurred_at)
                            FROM learning_activities la
                            WHERE la.student_id = ?
                              AND la.course_id = ae.course_id)
                       ) AS last_activity_at
                FROM active_enrollments ae
                LEFT JOIN course_completed_totals cct ON cct.course_id = ae.course_id
            ),
            quiz_attempt_stats AS (
                SELECT qa.quiz_id,
                       TRUE AS has_attempt,
                       BOOL_OR(qa.passed) AS best_passed
                FROM quiz_attempts qa
                WHERE qa.student_id = ?
                GROUP BY qa.quiz_id
            ),
            ordered_uncompleted AS (
                SELECT ae.course_id,
                       ae.course_title,
                       ae.course_slug,
                       l.id AS lesson_id,
                       l.title AS lesson_title,
                       l.lesson_type,
                       s.title AS section_title,
                       l.duration_seconds,
                       COALESCE(cct.completed_lessons, 0) AS completed_lessons,
                       COALESCE(clt.total_lessons, 0) AS total_lessons,
                       lca.last_activity_at,
                       COALESCE(qas.has_attempt, FALSE) AS has_quiz_attempt,
                       qas.best_passed,
                       ROW_NUMBER() OVER (
                           PARTITION BY ae.course_id
                           ORDER BY s.position ASC, l.position ASC, l.id ASC
                       ) AS course_rank
                FROM active_enrollments ae
                JOIN sections s ON s.course_id = ae.course_id
                JOIN lessons l ON l.section_id = s.id AND l.status = 'PUBLISHED'
                LEFT JOIN learning_progress lp ON lp.enrollment_id = ae.enrollment_id AND lp.lesson_id = l.id
                LEFT JOIN course_lesson_totals clt ON clt.course_id = ae.course_id
                LEFT JOIN course_completed_totals cct ON cct.course_id = ae.course_id
                LEFT JOIN last_course_activity lca ON lca.course_id = ae.course_id
                LEFT JOIN quizzes q ON q.lesson_id = l.id
                LEFT JOIN quiz_attempt_stats qas ON qas.quiz_id = q.id
                WHERE lp.id IS NULL
            )
            SELECT course_id,
                   course_title,
                   course_slug,
                   lesson_id,
                   lesson_title,
                   lesson_type,
                   section_title,
                   duration_seconds,
                   completed_lessons,
                   total_lessons,
                   last_activity_at,
                   has_quiz_attempt,
                   best_passed
            FROM ordered_uncompleted
            WHERE course_rank = 1
            ORDER BY last_activity_at DESC NULLS LAST, course_title ASC
            LIMIT 10
            """;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public RecommendationRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public List<CandidateCourseRow> findPublishedCourses(int limit) {
        return jdbcTemplate.query(
                PUBLISHED_COURSES_SQL,
                (rs, rowNum) -> new CandidateCourseRow(
                        rs.getObject("id", UUID.class),
                        rs.getObject("instructor_id", UUID.class),
                        rs.getString("title"),
                        rs.getString("slug"),
                        rs.getString("tagline"),
                        rs.getString("description"),
                        rs.getString("thumbnail_key"),
                        rs.getBigDecimal("price"),
                        rs.getBigDecimal("original_price"),
                        rs.getString("level"),
                        rs.getString("language"),
                        rs.getString("status"),
                        toInstant(rs.getTimestamp("published_at")),
                        rs.getString("instructor_name"),
                        rs.getString("instructor_avatar_key"),
                        rs.getString("instructor_headline"),
                        rs.getString("instructor_custom_handle"),
                        rs.getLong("enrollment_count"),
                        rs.getDouble("average_rating"),
                        rs.getLong("review_count")
                ),
                limit
        );
    }

    public List<UUID> findActiveEnrolledCourseIds(UUID userId) {
        return jdbcTemplate.query(
                "SELECT course_id FROM enrollments WHERE student_id = ? AND status = 'ACTIVE'",
                (rs, rowNum) -> rs.getObject("course_id", UUID.class),
                userId
        );
    }

    public List<UUID> findDismissedTargetIds(UUID userId, String targetType) {
        return jdbcTemplate.query(
                """
                SELECT DISTINCT target_id
                FROM recommendation_feedbacks
                WHERE user_id = ?
                  AND target_type = ?
                  AND feedback_type = 'DISMISSED'
                """,
                (rs, rowNum) -> rs.getObject("target_id", UUID.class),
                userId,
                targetType
        );
    }

    public StudentPreferencesRow findUserPreferences(UUID userId) {
        List<StudentPreferencesRow> rows = jdbcTemplate.query(
                """
                SELECT ulp.preferred_topics::text AS preferred_topics_json,
                       ulp.preferred_level,
                       COALESCE(ulp.learning_goal, sp.learning_goal) AS effective_goal,
                       ulp.weekly_target_hours,
                       ulp.personalization_enabled,
                       ulp.onboarding_completed,
                       sp.interests AS profile_interests
                FROM users u
                LEFT JOIN user_learning_preferences ulp ON ulp.user_id = u.id
                LEFT JOIN student_profiles sp ON sp.user_id = u.id
                WHERE u.id = ?
                """,
                (rs, rowNum) -> {
                    String topicsJson = rs.getString("preferred_topics_json");
                    List<String> topics = parseTopicsJson(topicsJson);
                    boolean hasOnboardingRow = topicsJson != null;
                    if (topics.isEmpty()) {
                        topics = splitCommaTopics(rs.getString("profile_interests"));
                    }
                    Integer weeklyHours = (Integer) rs.getObject("weekly_target_hours");
                    Boolean personalizationObj = (Boolean) rs.getObject("personalization_enabled");
                    Boolean onboardingObj = (Boolean) rs.getObject("onboarding_completed");
                    return new StudentPreferencesRow(
                            topics,
                            rs.getString("preferred_level"),
                            rs.getString("effective_goal"),
                            weeklyHours,
                            hasOnboardingRow ? Boolean.TRUE.equals(personalizationObj) : true,
                            hasOnboardingRow && Boolean.TRUE.equals(onboardingObj)
                    );
                },
                userId
        );
        if (rows.isEmpty()) {
            return new StudentPreferencesRow(List.of(), null, null, null, true, false);
        }
        return rows.get(0);
    }

    public void upsertUserPreferences(
            UUID userId,
            List<String> preferredTopics,
            String preferredLevel,
            String learningGoal,
            Integer weeklyTargetHours,
            boolean personalizationEnabled,
            boolean onboardingCompleted
    ) {
        String topicsJson = writeTopicsJson(preferredTopics);
        jdbcTemplate.update(
                """
                INSERT INTO user_learning_preferences (
                    user_id, preferred_topics, preferred_level, learning_goal,
                    weekly_target_hours, personalization_enabled, onboarding_completed,
                    created_at, updated_at
                )
                VALUES (?, CAST(? AS jsonb), ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET
                    preferred_topics = EXCLUDED.preferred_topics,
                    preferred_level = EXCLUDED.preferred_level,
                    learning_goal = EXCLUDED.learning_goal,
                    weekly_target_hours = EXCLUDED.weekly_target_hours,
                    personalization_enabled = EXCLUDED.personalization_enabled,
                    onboarding_completed = EXCLUDED.onboarding_completed,
                    updated_at = CURRENT_TIMESTAMP
                """,
                userId,
                topicsJson,
                preferredLevel,
                learningGoal,
                weeklyTargetHours,
                personalizationEnabled,
                onboardingCompleted
        );

        String interestsSummary = preferredTopics == null || preferredTopics.isEmpty()
                ? null
                : String.join(", ", preferredTopics);
        jdbcTemplate.update(
                """
                UPDATE student_profiles
                SET learning_goal = COALESCE(?, learning_goal),
                    interests = COALESCE(?, interests),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                learningGoal,
                interestsSummary,
                userId
        );
    }

    public List<SignalCourseRow> findPositiveSignalCourses(UUID userId) {
        return jdbcTemplate.query(
                POSITIVE_USER_SIGNAL_COURSES_SQL,
                (rs, rowNum) -> new SignalCourseRow(
                        rs.getObject("course_id", UUID.class),
                        rs.getString("title"),
                        rs.getString("tagline"),
                        rs.getString("description"),
                        rs.getString("level"),
                        rs.getDouble("total_weight"),
                        toInstant(rs.getTimestamp("latest_at"))
                ),
                userId,
                userId,
                userId
        );
    }

    public List<WeakQuizTopicRow> findWeakQuizTopics(UUID userId) {
        return jdbcTemplate.query(
                WEAK_QUIZ_TOPICS_SQL,
                (rs, rowNum) -> new WeakQuizTopicRow(
                        rs.getObject("quiz_id", UUID.class),
                        rs.getObject("lesson_id", UUID.class),
                        rs.getString("lesson_title"),
                        rs.getString("section_title"),
                        rs.getObject("course_id", UUID.class),
                        rs.getString("course_title"),
                        rs.getString("course_slug"),
                        rs.getDouble("passing_score"),
                        toNullableDouble(rs.getObject("best_score")),
                        rs.getInt("attempt_count"),
                        (Integer) rs.getObject("duration_seconds")
                ),
                userId,
                userId
        );
    }

    public List<NextLessonCandidateRow> findNextLessonCandidates(UUID userId) {
        return jdbcTemplate.query(
                NEXT_LESSON_CANDIDATES_SQL,
                (rs, rowNum) -> new NextLessonCandidateRow(
                        rs.getObject("course_id", UUID.class),
                        rs.getString("course_title"),
                        rs.getString("course_slug"),
                        rs.getObject("lesson_id", UUID.class),
                        rs.getString("lesson_title"),
                        rs.getString("lesson_type"),
                        rs.getString("section_title"),
                        (Integer) rs.getObject("duration_seconds"),
                        rs.getLong("completed_lessons"),
                        rs.getLong("total_lessons"),
                        toInstant(rs.getTimestamp("last_activity_at")),
                        rs.getBoolean("has_quiz_attempt"),
                        (Boolean) rs.getObject("best_passed")
                ),
                userId,
                userId,
                userId
        );
    }

    public CachedSnapshotHeader findValidSnapshot(
            UUID userId,
            String scope,
            UUID contextCourseId,
            String algorithmVersion
    ) {
        String sql = contextCourseId == null
                ? """
                  SELECT id, algorithm_version, generated_at, expires_at
                  FROM recommendation_snapshots
                  WHERE user_id = ?
                    AND recommendation_scope = ?
                    AND stale = FALSE
                    AND algorithm_version = ?
                    AND expires_at > CURRENT_TIMESTAMP
                    AND context_course_id IS NULL
                  ORDER BY generated_at DESC
                  LIMIT 1
                  """
                : """
                  SELECT id, algorithm_version, generated_at, expires_at
                  FROM recommendation_snapshots
                  WHERE user_id = ?
                    AND recommendation_scope = ?
                    AND stale = FALSE
                    AND algorithm_version = ?
                    AND expires_at > CURRENT_TIMESTAMP
                    AND context_course_id = ?
                  ORDER BY generated_at DESC
                  LIMIT 1
                  """;
        Object[] params = contextCourseId == null
                ? new Object[]{userId, scope, algorithmVersion}
                : new Object[]{userId, scope, algorithmVersion, contextCourseId};
        List<CachedSnapshotHeader> rows = jdbcTemplate.query(
                sql,
                (rs, rowNum) -> new CachedSnapshotHeader(
                        rs.getObject("id", UUID.class),
                        rs.getString("algorithm_version"),
                        rs.getTimestamp("generated_at").toInstant(),
                        rs.getTimestamp("expires_at").toInstant()
                ),
                params
        );
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<CachedSnapshotItemRow> findSnapshotItems(UUID snapshotId, int limit) {
        return jdbcTemplate.query(
                """
                SELECT id, item_type, target_id, course_id, lesson_id,
                       rank_position, score, tier, reason_code, reason_text,
                       estimated_minutes, target_url
                FROM recommendation_items
                WHERE snapshot_id = ?
                ORDER BY rank_position ASC
                LIMIT ?
                """,
                (rs, rowNum) -> new CachedSnapshotItemRow(
                        rs.getObject("id", UUID.class),
                        rs.getString("item_type"),
                        rs.getObject("target_id", UUID.class),
                        rs.getObject("course_id", UUID.class),
                        rs.getObject("lesson_id", UUID.class),
                        rs.getInt("rank_position"),
                        rs.getDouble("score"),
                        rs.getString("tier"),
                        rs.getString("reason_code"),
                        rs.getString("reason_text"),
                        (Integer) rs.getObject("estimated_minutes"),
                        rs.getString("target_url")
                ),
                snapshotId,
                limit
        );
    }

    public void saveSnapshot(
            UUID snapshotId,
            UUID userId,
            String scope,
            UUID contextCourseId,
            String algorithmVersion,
            Instant generatedAt,
            Instant expiresAt,
            List<SnapshotItemWriteRow> items
    ) {
        if (contextCourseId == null) {
            jdbcTemplate.update(
                    """
                    UPDATE recommendation_snapshots
                    SET stale = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                      AND recommendation_scope = ?
                      AND stale = FALSE
                      AND context_course_id IS NULL
                    """,
                    userId,
                    scope
            );
        } else {
            jdbcTemplate.update(
                    """
                    UPDATE recommendation_snapshots
                    SET stale = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                      AND recommendation_scope = ?
                      AND stale = FALSE
                      AND context_course_id = ?
                    """,
                    userId,
                    scope,
                    contextCourseId
            );
        }

        jdbcTemplate.update(
                """
                INSERT INTO recommendation_snapshots (
                    id, user_id, recommendation_scope, context_course_id,
                    algorithm_version, generated_at, expires_at, stale,
                    created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                snapshotId,
                userId,
                scope,
                contextCourseId,
                algorithmVersion,
                Timestamp.from(generatedAt),
                Timestamp.from(expiresAt)
        );

        for (SnapshotItemWriteRow item : items) {
            jdbcTemplate.update(
                    """
                    INSERT INTO recommendation_items (
                        id, snapshot_id, item_type, target_id, course_id, lesson_id,
                        rank_position, score, tier, reason_code, reason_text,
                        estimated_minutes, target_url, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                    item.id(),
                    snapshotId,
                    item.itemType(),
                    item.targetId(),
                    item.courseId(),
                    item.lessonId(),
                    item.rankPosition(),
                    item.score(),
                    item.tier(),
                    item.reasonCode(),
                    item.reasonText(),
                    item.estimatedMinutes(),
                    item.targetUrl()
            );
        }
    }

    public void invalidateUserSnapshots(UUID userId, String scopeOrNull) {
        if (scopeOrNull == null) {
            jdbcTemplate.update(
                    """
                    UPDATE recommendation_snapshots
                    SET stale = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND stale = FALSE
                    """,
                    userId
            );
        } else {
            jdbcTemplate.update(
                    """
                    UPDATE recommendation_snapshots
                    SET stale = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND recommendation_scope = ? AND stale = FALSE
                    """,
                    userId,
                    scopeOrNull
            );
        }
    }

    public void insertSignal(
            UUID userId,
            UUID courseId,
            UUID lessonId,
            String signalType,
            UUID sourceId,
            double weight,
            String metadataJson,
            Instant occurredAt
    ) {
        if (sourceId != null) {
            jdbcTemplate.update(
                    """
                    INSERT INTO learning_signals (
                        id, user_id, course_id, lesson_id, signal_type,
                        source_id, signal_weight, metadata, occurred_at, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (source_id, signal_type) WHERE source_id IS NOT NULL DO NOTHING
                    """,
                    UUID.randomUUID(),
                    userId,
                    courseId,
                    lessonId,
                    signalType,
                    sourceId,
                    weight,
                    metadataJson,
                    Timestamp.from(occurredAt != null ? occurredAt : Instant.now())
            );
        } else {
            jdbcTemplate.update(
                    """
                    INSERT INTO learning_signals (
                        id, user_id, course_id, lesson_id, signal_type,
                        source_id, signal_weight, metadata, occurred_at, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, NULL, ?, CAST(? AS jsonb), ?, CURRENT_TIMESTAMP)
                    """,
                    UUID.randomUUID(),
                    userId,
                    courseId,
                    lessonId,
                    signalType,
                    weight,
                    metadataJson,
                    Timestamp.from(occurredAt != null ? occurredAt : Instant.now())
            );
        }
    }

    public boolean existsCourse(UUID courseId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM courses WHERE id = ? AND status = 'PUBLISHED'",
                Integer.class,
                courseId
        );
        return count != null && count > 0;
    }

    public void insertFeedback(
            UUID userId,
            UUID snapshotId,
            UUID recommendationItemId,
            String targetType,
            UUID targetId,
            String feedbackType
    ) {
        UUID validSnapshotId = snapshotId != null && ownsSnapshot(userId, snapshotId) ? snapshotId : null;
        UUID validItemId = validSnapshotId != null && recommendationItemId != null
                && belongsToSnapshot(recommendationItemId, validSnapshotId)
                ? recommendationItemId
                : null;
        jdbcTemplate.update(
                """
                INSERT INTO recommendation_feedbacks (
                    id, user_id, snapshot_id, recommendation_item_id,
                    target_type, target_id, feedback_type, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                UUID.randomUUID(),
                userId,
                validSnapshotId,
                validItemId,
                targetType,
                targetId,
                feedbackType
        );
    }

    private boolean ownsSnapshot(UUID userId, UUID snapshotId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM recommendation_snapshots WHERE id = ? AND user_id = ?",
                Integer.class,
                snapshotId,
                userId
        );
        return count != null && count > 0;
    }

    private boolean belongsToSnapshot(UUID itemId, UUID snapshotId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM recommendation_items WHERE id = ? AND snapshot_id = ?",
                Integer.class,
                itemId,
                snapshotId
        );
        return count != null && count > 0;
    }

    private List<String> parseTopicsJson(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }
        try {
            List<String> parsed = objectMapper.readValue(rawJson, new TypeReference<>() {
            });
            return parsed == null ? List.of() : parsed.stream()
                    .filter(s -> s != null && !s.isBlank())
                    .map(String::trim)
                    .toList();
        } catch (JacksonException ex) {
            return List.of();
        }
    }

    private String writeTopicsJson(List<String> topics) {
        try {
            return objectMapper.writeValueAsString(topics == null ? List.of() : topics);
        } catch (JacksonException ex) {
            return "[]";
        }
    }

    private List<String> splitCommaTopics(String rawInterests) {
        if (rawInterests == null || rawInterests.isBlank()) {
            return List.of();
        }
        String[] parts = rawInterests.split("[,;]+");
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isBlank()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private Instant toInstant(Timestamp ts) {
        return ts != null ? ts.toInstant() : null;
    }

    private Double toNullableDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : null;
    }
}
