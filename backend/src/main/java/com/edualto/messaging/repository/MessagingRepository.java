package com.edualto.messaging.repository;

import com.edualto.messaging.dto.ConversationResponse;
import com.edualto.messaging.dto.MessageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class MessagingRepository {
    private static final RowMapper<ConversationResponse> CONVERSATION_MAPPER = (resultSet, rowNumber) -> mapConversation(resultSet);
    private static final RowMapper<MessageResponse> MESSAGE_MAPPER = (resultSet, rowNumber) -> mapMessage(resultSet);

    private final JdbcTemplate jdbcTemplate;

    public MessagingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean hasActiveRole(UUID userId, String role) {
        Integer count = jdbcTemplate.queryForObject("""
                select count(*) from users u
                join user_roles ur on ur.user_id = u.id
                join roles r on r.id = ur.role_id
                where u.id = ? and u.status = 'ACTIVE' and r.name = ?
                """, Integer.class, userId, role);
        return count != null && count > 0;
    }

    public UUID openConversation(UUID instructorId, UUID studentId) {
        UUID conversationId = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into conversations (id, instructor_id, student_id)
                values (?, ?, ?)
                on conflict (instructor_id, student_id) do nothing
                """, conversationId, instructorId, studentId);
        UUID id = jdbcTemplate.queryForObject("""
                select id from conversations where instructor_id = ? and student_id = ?
                """, UUID.class, instructorId, studentId);
        jdbcTemplate.update("""
                update conversations set instructor_hidden_at = null, updated_at = current_timestamp
                where id = ?
                """, id);
        return id;
    }

    public Optional<ConversationState> findConversation(UUID conversationId) {
        List<ConversationState> result = jdbcTemplate.query("""
                select id, instructor_id, student_id, instructor_blocked_at, instructor_hidden_at
                from conversations where id = ? for update
                """, (rs, row) -> new ConversationState(
                rs.getObject("id", UUID.class),
                rs.getObject("instructor_id", UUID.class),
                rs.getObject("student_id", UUID.class),
                instant(rs, "instructor_blocked_at"),
                instant(rs, "instructor_hidden_at")
        ), conversationId);
        return result.stream().findFirst();
    }

    public List<ConversationResponse> listConversations(UUID userId, boolean instructor, int page, int size) {
        String participantColumn = instructor ? "c.instructor_id" : "c.student_id";
        String hiddenFilter = instructor ? "and c.instructor_hidden_at is null" : "";
        String sql = """
                select c.id, c.instructor_id, iu.full_name instructor_name, c.student_id, su.full_name student_name,
                       lm.body last_message, lm.created_at last_message_at,
                       (select count(*) from messages unread where unread.conversation_id = c.id
                         and unread.sender_id <> ? and unread.read_at is null) unread_count,
                       (c.instructor_blocked_at is not null) blocked
                from conversations c
                join users iu on iu.id = c.instructor_id
                join users su on su.id = c.student_id
                left join lateral (
                    select body, created_at from messages where conversation_id = c.id
                    order by created_at desc, id desc limit 1
                ) lm on true
                where %s = ? %s
                order by coalesce(lm.created_at, c.updated_at) desc, c.id desc
                limit ? offset ?
                """.formatted(participantColumn, hiddenFilter);
        return jdbcTemplate.query(sql, CONVERSATION_MAPPER, userId, userId, size, (long) page * size);
    }

    public long countConversations(UUID userId, boolean instructor) {
        String participantColumn = instructor ? "instructor_id" : "student_id";
        String hiddenFilter = instructor ? " and instructor_hidden_at is null" : "";
        Long count = jdbcTemplate.queryForObject(
                "select count(*) from conversations where " + participantColumn + " = ?" + hiddenFilter,
                Long.class,
                userId
        );
        return count == null ? 0 : count;
    }

    public List<MessageResponse> listMessages(UUID conversationId, int page, int size) {
        List<MessageResponse> messages = jdbcTemplate.query("""
                select id, sender_id, body, created_at, read_at from messages
                where conversation_id = ? order by created_at desc, id desc limit ? offset ?
                """, MESSAGE_MAPPER, conversationId, size, (long) page * size);
        return messages.reversed();
    }

    public long countMessages(UUID conversationId) {
        Long count = jdbcTemplate.queryForObject(
                "select count(*) from messages where conversation_id = ?", Long.class, conversationId);
        return count == null ? 0 : count;
    }

    public MessageResponse insertMessage(UUID conversationId, UUID senderId, String body) {
        UUID messageId = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into messages (id, conversation_id, sender_id, body)
                values (?, ?, ?, ?)
                """, messageId, conversationId, senderId, body.trim());
        jdbcTemplate.update("update conversations set updated_at = current_timestamp where id = ?", conversationId);
        return jdbcTemplate.queryForObject("""
                select id, sender_id, body, created_at, read_at from messages where id = ?
                """, MESSAGE_MAPPER, messageId);
    }

    public void markIncomingRead(UUID conversationId, UUID userId) {
        jdbcTemplate.update("""
                update messages set read_at = current_timestamp
                where conversation_id = ? and sender_id <> ? and read_at is null
                """, conversationId, userId);
    }

    public void setBlocked(UUID conversationId, boolean blocked) {
        jdbcTemplate.update("""
                update conversations
                set instructor_blocked_at = case when ? then current_timestamp else null end,
                    updated_at = current_timestamp
                where id = ?
                """, blocked, conversationId);
    }

    public void hideForInstructor(UUID conversationId) {
        jdbcTemplate.update("""
                update conversations set instructor_hidden_at = current_timestamp, updated_at = current_timestamp
                where id = ?
                """, conversationId);
    }

    private static ConversationResponse mapConversation(ResultSet resultSet) throws SQLException {
        Timestamp lastMessageAt = resultSet.getTimestamp("last_message_at");
        return new ConversationResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("instructor_id", UUID.class),
                resultSet.getString("instructor_name"),
                resultSet.getObject("student_id", UUID.class),
                resultSet.getString("student_name"),
                resultSet.getString("last_message"),
                lastMessageAt == null ? null : lastMessageAt.toInstant(),
                resultSet.getLong("unread_count"),
                resultSet.getBoolean("blocked")
        );
    }

    private static MessageResponse mapMessage(ResultSet resultSet) throws SQLException {
        return new MessageResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("sender_id", UUID.class),
                resultSet.getString("body"),
                resultSet.getTimestamp("created_at").toInstant(),
                instant(resultSet, "read_at")
        );
    }

    private static Instant instant(ResultSet resultSet, String column) throws SQLException {
        Timestamp timestamp = resultSet.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    public record ConversationState(
            UUID id,
            UUID instructorId,
            UUID studentId,
            Instant blockedAt,
            Instant hiddenAt
    ) {
    }
}
