package com.edualto.notification.repository;

import com.edualto.notification.dto.LearnerNotificationRecord;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LearnerNotificationRepository {
    private final JdbcTemplate jdbc;

    public LearnerNotificationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long count(UUID studentId) {
        Long count = jdbc.queryForObject("""
                select
                    (select count(*)
                     from instructor_notifications n
                     where n.deleted_at is null and n.status = 'PUBLISHED'
                       and (n.starts_at is null or n.starts_at <= current_timestamp)
                       and (n.ends_at is null or n.ends_at > current_timestamp)
                       and (n.audience = 'ALL_STUDENTS' or (
                           n.audience = 'ENROLLED_STUDENTS'
                           and exists (
                               select 1 from enrollments e
                               join courses c on c.id = e.course_id
                               where e.student_id = ? and e.status = 'ACTIVE'
                                 and c.instructor_id = n.instructor_id
                           )
                       )))
                    +
                    (select count(*) from course_reviews r
                     where r.student_id = ? and r.status = 'PUBLISHED'
                       and r.instructor_reply is not null)
                """, Long.class, studentId, studentId);
        return count == null ? 0 : count;
    }

    public List<LearnerNotificationRecord> list(UUID studentId, int limit, long offset) {
        return jdbc.query("""
                select id, type, instructor_name, instructor_avatar_key, title, description, link_url, image_key, created_at
                from (
                    select n.id, 'ANNOUNCEMENT' as type, u.full_name as instructor_name,
                           p.avatar_key as instructor_avatar_key,
                           n.title, n.description, n.link_url, n.image_key, n.published_at as created_at
                    from instructor_notifications n
                    join users u on u.id = n.instructor_id
                    left join profiles p on p.user_id = u.id
                    where n.deleted_at is null and n.status = 'PUBLISHED'
                      and (n.starts_at is null or n.starts_at <= current_timestamp)
                      and (n.ends_at is null or n.ends_at > current_timestamp)
                      and (n.audience = 'ALL_STUDENTS' or (
                          n.audience = 'ENROLLED_STUDENTS'
                          and exists (
                              select 1 from enrollments e
                              join courses c on c.id = e.course_id
                              where e.student_id = ? and e.status = 'ACTIVE'
                                and c.instructor_id = n.instructor_id
                          )
                      ))
                    union all
                    select r.id, 'REVIEW_REPLY' as type, instructor.full_name as instructor_name,
                           instructor_profile.avatar_key as instructor_avatar_key,
                           concat('Phản hồi đánh giá: ', c.title) as title, r.instructor_reply as description,
                           concat('/learning/courses/', r.course_id, '#reviews') as link_url,
                           null::varchar as image_key, r.instructor_replied_at as created_at
                    from course_reviews r
                    join courses c on c.id = r.course_id
                    join users instructor on instructor.id = c.instructor_id
                    left join profiles instructor_profile on instructor_profile.user_id = instructor.id
                    where r.student_id = ? and r.status = 'PUBLISHED'
                      and r.instructor_reply is not null
                ) learner_notifications
                order by created_at desc, id desc
                limit ? offset ?
                """, this::map, studentId, studentId, limit, offset);
    }

    private LearnerNotificationRecord map(ResultSet resultSet, int rowNumber) throws SQLException {
        OffsetDateTime createdAt = resultSet.getObject("created_at", OffsetDateTime.class);
        return new LearnerNotificationRecord(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("type"),
                resultSet.getString("instructor_name"),
                resultSet.getString("instructor_avatar_key"),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getString("link_url"),
                resultSet.getString("image_key"),
                createdAt == null ? null : createdAt.toInstant());
    }
}
