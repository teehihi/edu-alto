package com.edualto.notification.repository;

import com.edualto.notification.domain.NotificationAudience;
import com.edualto.notification.domain.NotificationStatus;
import com.edualto.notification.dto.InstructorNotificationRequest;
import com.edualto.notification.dto.InstructorNotificationResponse;
import com.edualto.notification.dto.InstructorAnnouncementRecord;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InstructorNotificationRepository {
    private final JdbcTemplate jdbc;

    public InstructorNotificationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long count(UUID instructorId, NotificationStatus status, NotificationAudience audience) {
        Long count = jdbc.queryForObject("""
                select count(*) from instructor_notifications
                where instructor_id = ? and deleted_at is null
                  and (cast(? as varchar) is null or status = ?)
                  and (cast(? as varchar) is null or audience = ?)
                """, Long.class, instructorId, enumValue(status), enumValue(status),
                enumValue(audience), enumValue(audience));
        return count == null ? 0 : count;
    }

    public List<InstructorNotificationResponse> list(UUID instructorId, NotificationStatus status,
            NotificationAudience audience, int limit, long offset) {
        return jdbc.query("""
                select id,title,description,link_url,audience,image_key,status,starts_at,ends_at,published_at,created_at,updated_at
                from instructor_notifications
                where instructor_id = ? and deleted_at is null
                  and (cast(? as varchar) is null or status = ?)
                  and (cast(? as varchar) is null or audience = ?)
                order by created_at desc, id desc
                limit ? offset ?
                """, this::map, instructorId, enumValue(status), enumValue(status),
                enumValue(audience), enumValue(audience), limit, offset);
    }

    public Optional<InstructorNotificationResponse> find(UUID instructorId, UUID notificationId) {
        return jdbc.query("""
                select id,title,description,link_url,audience,image_key,status,starts_at,ends_at,published_at,created_at,updated_at
                from instructor_notifications
                where instructor_id = ? and id = ? and deleted_at is null
                """, this::map, instructorId, notificationId).stream().findFirst();
    }

    public long countActiveAnnouncements(UUID studentId) {
        Long count = jdbc.queryForObject("""
                select count(*)
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
                  ))
                """, Long.class, studentId);
        return count == null ? 0 : count;
    }

    public List<InstructorAnnouncementRecord> listActiveAnnouncements(UUID studentId,
            int limit, long offset) {
        return jdbc.query("""
                select n.id, u.full_name as instructor_name, n.title, n.description, n.link_url,
                       n.image_key, n.published_at
                from instructor_notifications n
                join users u on u.id = n.instructor_id
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
                order by n.published_at desc, n.id desc
                limit ? offset ?
                """, (resultSet, rowNumber) -> new InstructorAnnouncementRecord(
                resultSet.getObject("id", UUID.class), resultSet.getString("instructor_name"),
                resultSet.getString("title"), resultSet.getString("description"),
                resultSet.getString("link_url"), resultSet.getString("image_key"),
                instant(resultSet, "published_at")), studentId, limit, offset);
    }

    public UUID insert(UUID instructorId, InstructorNotificationRequest request) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into instructor_notifications(id,instructor_id,title,description,link_url,audience,image_key,starts_at,ends_at)
                values (?,?,?,?,?,?,?,?,?)
                """, id, instructorId, request.title().trim(), request.description().trim(),
                trimToNull(request.linkUrl()), request.audience().name(), trimToNull(request.imageKey()),
                timestamp(request.startsAt()), timestamp(request.endsAt()));
        return id;
    }

    public boolean update(UUID instructorId, UUID notificationId, InstructorNotificationRequest request) {
        int updated = jdbc.update("""
                update instructor_notifications set title=?,description=?,link_url=?,audience=?,image_key=?,starts_at=?,ends_at=?,updated_at=current_timestamp
                where instructor_id=? and id=? and deleted_at is null and status='DRAFT'
                """, request.title().trim(), request.description().trim(), trimToNull(request.linkUrl()),
                request.audience().name(), trimToNull(request.imageKey()), timestamp(request.startsAt()),
                timestamp(request.endsAt()), instructorId, notificationId);
        return updated == 1;
    }

    public int publish(UUID instructorId, UUID notificationId) {
        return jdbc.update("""
                update instructor_notifications set status='PUBLISHED',published_at=current_timestamp,updated_at=current_timestamp
                where instructor_id=? and id=? and deleted_at is null and status='DRAFT'
                """, instructorId, notificationId);
    }

    public int softDelete(UUID instructorId, UUID notificationId) {
        return jdbc.update("""
                update instructor_notifications set deleted_at=current_timestamp,updated_at=current_timestamp
                where instructor_id=? and id=? and deleted_at is null
                """, instructorId, notificationId);
    }

    private InstructorNotificationResponse map(ResultSet resultSet, int rowNumber) throws SQLException {
        return new InstructorNotificationResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("title"),
                resultSet.getString("description"),
                resultSet.getString("link_url"),
                NotificationAudience.valueOf(resultSet.getString("audience")),
                resultSet.getString("image_key"),
                null,
                NotificationStatus.valueOf(resultSet.getString("status")),
                instant(resultSet, "starts_at"),
                instant(resultSet, "ends_at"),
                instant(resultSet, "published_at"),
                instant(resultSet, "created_at"),
                instant(resultSet, "updated_at"));
    }

    private static Instant instant(ResultSet resultSet, String column) throws SQLException {
        OffsetDateTime timestamp = resultSet.getObject(column, OffsetDateTime.class);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static OffsetDateTime timestamp(Instant instant) {
        return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
    }

    private static String enumValue(Enum<?> value) {
        return value == null ? null : value.name();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
