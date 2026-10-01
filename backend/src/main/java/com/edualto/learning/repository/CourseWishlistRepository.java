package com.edualto.learning.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CourseWishlistRepository {
    private final JdbcTemplate jdbc;

    public CourseWishlistRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<WishlistCourseRow> findPublishedByUserId(UUID userId, int limit, int offset) {
        return jdbc.query("""
                select c.id as course_id, c.instructor_id, c.title, c.slug, c.tagline, c.thumbnail_key, c.price,
                       c.original_price, c.level, c.language, c.status, c.published_at,
                       instructor.full_name as instructor_name, profile.headline as instructor_headline,
                       profile.avatar_key as instructor_avatar_key, profile.custom_handle as instructor_custom_handle,
                       wishlist.created_at as saved_at
                from course_wishlists wishlist
                join courses c on c.id = wishlist.course_id and c.status = 'PUBLISHED'
                join users instructor on instructor.id = c.instructor_id
                left join profiles profile on profile.user_id = instructor.id
                where wishlist.user_id = ?
                order by wishlist.created_at desc, wishlist.id asc
                limit ? offset ?
                """, (rs, row) -> new WishlistCourseRow(
                rs.getObject("course_id", UUID.class), rs.getObject("instructor_id", UUID.class),
                rs.getString("title"), rs.getString("slug"),
                rs.getString("tagline"), rs.getString("thumbnail_key"), rs.getBigDecimal("price"),
                rs.getBigDecimal("original_price"), rs.getString("level"), rs.getString("language"),
                rs.getString("status"), rs.getTimestamp("published_at") == null ? null
                        : rs.getTimestamp("published_at").toInstant(),
                rs.getString("instructor_name"), rs.getString("instructor_headline"),
                rs.getString("instructor_avatar_key"), rs.getString("instructor_custom_handle"),
                rs.getTimestamp("saved_at").toInstant()), userId, limit, offset);
    }

    public long countPublishedByUserId(UUID userId) {
        Long count = jdbc.queryForObject("""
                select count(*) from course_wishlists wishlist
                join courses c on c.id = wishlist.course_id and c.status = 'PUBLISHED'
                where wishlist.user_id = ?
                """, Long.class, userId);
        return count == null ? 0 : count;
    }

    public int insertIfAbsent(UUID id, UUID userId, UUID courseId) {
        return jdbc.update("""
                insert into course_wishlists (id, user_id, course_id, created_at)
                values (?, ?, ?, current_timestamp)
                on conflict (user_id, course_id) do nothing
                """, id, userId, courseId);
    }

    public int delete(UUID userId, UUID courseId) {
        return jdbc.update("delete from course_wishlists where user_id = ? and course_id = ?", userId, courseId);
    }

    public record WishlistCourseRow(
            UUID courseId,
            UUID instructorId,
            String title,
            String slug,
            String tagline,
            String thumbnailKey,
            BigDecimal price,
            BigDecimal originalPrice,
            String level,
            String language,
            String status,
            Instant publishedAt,
            String instructorName,
            String instructorHeadline,
            String instructorAvatarKey,
            String instructorCustomHandle,
            Instant savedAt
    ) {
    }
}
