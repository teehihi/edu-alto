package com.edualto.commerce.repository;

import com.edualto.commerce.dto.PromotionRequest;
import com.edualto.commerce.dto.PromotionResponse;
import com.edualto.commerce.dto.PromotionSummaryResponse;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PromotionRepository {
    private final JdbcTemplate jdbc;

    public PromotionRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean ownsCourse(UUID instructorId, UUID courseId) {
        Boolean exists = jdbc.queryForObject("select exists(select 1 from courses where id = ? and instructor_id = ?)",
                Boolean.class, courseId, instructorId);
        return Boolean.TRUE.equals(exists);
    }

    public boolean ownsPromotion(UUID instructorId, UUID promotionId) {
        Boolean exists = jdbc.queryForObject("select exists(select 1 from course_promotions p join courses c on c.id = p.course_id where p.id = ? and c.instructor_id = ?)",
                Boolean.class, promotionId, instructorId);
        return Boolean.TRUE.equals(exists);
    }

    public long count(UUID courseId, String search, String status) {
        Long result = jdbc.queryForObject("""
                select count(*) from course_promotions p
                where p.course_id = ? and (cast(? as varchar) is null or p.name ilike '%' || ? || '%' or p.code ilike '%' || ? || '%')
                  and (cast(? as varchar) is null or (case when not p.enabled then 'DISABLED'
                    when p.ends_at <= current_timestamp then 'EXPIRED'
                    when p.max_redemptions is not null and (select count(*) from promotion_redemptions r where r.promotion_id=p.id and (r.status='REDEEMED' or (r.status='RESERVED' and r.reserved_until > current_timestamp))) >= p.max_redemptions then 'EXHAUSTED'
                    when p.starts_at > current_timestamp then 'SCHEDULED' else 'ACTIVE' end) = ?)
                """, Long.class, courseId, search, search, search, status, status);
        return result == null ? 0 : result;
    }

    public List<PromotionResponse> list(UUID courseId, String search, String status, int limit, long offset) {
        return jdbc.query("""
                select p.id,p.course_id,p.name,p.code,p.discount_type,p.discount_value,p.max_redemptions,p.starts_at,p.ends_at,
                       (select count(*) from promotion_redemptions r where r.promotion_id=p.id and r.status='REDEEMED') as redeemed_count,
                       (select coalesce(sum(r.discount_amount),0) from promotion_redemptions r where r.promotion_id=p.id and r.status='REDEEMED') as redeemed_amount,
                       case when not p.enabled then 'DISABLED' when p.ends_at <= current_timestamp then 'EXPIRED'
                         when p.max_redemptions is not null and (select count(*) from promotion_redemptions r where r.promotion_id=p.id and (r.status='REDEEMED' or (r.status='RESERVED' and r.reserved_until > current_timestamp))) >= p.max_redemptions then 'EXHAUSTED'
                         when p.starts_at > current_timestamp then 'SCHEDULED' else 'ACTIVE' end as promotion_status
                from course_promotions p
                where p.course_id = ? and (cast(? as varchar) is null or p.name ilike '%' || ? || '%' or p.code ilike '%' || ? || '%')
                  and (cast(? as varchar) is null or (case when not p.enabled then 'DISABLED' when p.ends_at <= current_timestamp then 'EXPIRED'
                         when p.max_redemptions is not null and (select count(*) from promotion_redemptions r where r.promotion_id=p.id and (r.status='REDEEMED' or (r.status='RESERVED' and r.reserved_until > current_timestamp))) >= p.max_redemptions then 'EXHAUSTED'
                         when p.starts_at > current_timestamp then 'SCHEDULED' else 'ACTIVE' end) = ?)
                order by p.created_at desc,p.id limit ? offset ?
                """, this::map, courseId, search, search, search, status, status, limit, offset);
    }

    public Optional<PromotionResponse> findResponse(UUID promotionId) {
        return jdbc.query("""
                select p.id,p.course_id,p.name,p.code,p.discount_type,p.discount_value,p.max_redemptions,p.starts_at,p.ends_at,
                       (select count(*) from promotion_redemptions r where r.promotion_id=p.id and r.status='REDEEMED') as redeemed_count,
                       (select coalesce(sum(r.discount_amount),0) from promotion_redemptions r where r.promotion_id=p.id and r.status='REDEEMED') as redeemed_amount,
                       case when not p.enabled then 'DISABLED' when p.ends_at <= current_timestamp then 'EXPIRED'
                         when p.max_redemptions is not null and (select count(*) from promotion_redemptions r where r.promotion_id=p.id and (r.status='REDEEMED' or (r.status='RESERVED' and r.reserved_until > current_timestamp))) >= p.max_redemptions then 'EXHAUSTED'
                         when p.starts_at > current_timestamp then 'SCHEDULED' else 'ACTIVE' end as promotion_status
                from course_promotions p where p.id=?
                """, this::map, promotionId).stream().findFirst();
    }

    public boolean codeExists(String code, UUID excludeId) {
        Boolean exists = jdbc.queryForObject("select exists(select 1 from course_promotions where code=? and (cast(? as uuid) is null or id<>?))",
                Boolean.class, code, excludeId, excludeId);
        return Boolean.TRUE.equals(exists);
    }

    public PromotionSummaryResponse summary(UUID courseId) {
        return jdbc.queryForObject("""
                select count(distinct p.id) as total_count,
                       count(distinct r.id) as redeemed_count,
                       coalesce(sum(r.discount_amount),0) as redeemed_amount
                from course_promotions p left join promotion_redemptions r on r.promotion_id=p.id and r.status='REDEEMED'
                where p.course_id=?
                """, (rs, rowNum) -> new PromotionSummaryResponse(rs.getLong("total_count"),
                rs.getLong("redeemed_count"), rs.getBigDecimal("redeemed_amount"), List.of()), courseId);
    }

    public List<PromotionSummaryResponse.Period> findRedemptionPeriods(UUID courseId, java.time.LocalDateTime firstMonth,
                                                                       java.time.LocalDateTime nextMonth) {
        return jdbc.query("""
                with months as (
                    select generate_series(cast(? as timestamp without time zone),
                           cast(? as timestamp without time zone) - interval '1 month', interval '1 month') as month_start
                ), redemptions as (
                    select date_trunc('month', r.redeemed_at at time zone 'Asia/Ho_Chi_Minh') as month_start,
                           count(r.id) as redeemed_count,
                           coalesce(sum(r.discount_amount),0) as redeemed_amount
                    from promotion_redemptions r join course_promotions p on p.id=r.promotion_id
                    where p.course_id=? and r.status='REDEEMED'
                      and r.redeemed_at >= (cast(? as timestamp without time zone) at time zone 'Asia/Ho_Chi_Minh')
                      and r.redeemed_at < (cast(? as timestamp without time zone) at time zone 'Asia/Ho_Chi_Minh')
                    group by date_trunc('month', r.redeemed_at at time zone 'Asia/Ho_Chi_Minh')
                )
                select to_char(months.month_start,'YYYY-MM') as label,
                       coalesce(redemptions.redeemed_count,0) as redeemed_count,
                       coalesce(redemptions.redeemed_amount,0) as redeemed_amount
                from months left join redemptions on redemptions.month_start=months.month_start
                order by months.month_start
                """, (rs, rowNum) -> new PromotionSummaryResponse.Period(rs.getString("label"),
                rs.getLong("redeemed_count"), rs.getBigDecimal("redeemed_amount")),
                firstMonth, nextMonth, courseId, firstMonth, nextMonth);
    }

    public UUID insert(UUID courseId, PromotionRequest request, String code) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into course_promotions(id,course_id,name,code,discount_type,discount_value,max_redemptions,starts_at,ends_at)
                values (?,?,?,?,?,?,?,?,?)
                """, id, courseId, request.name().trim(), code, request.discountType(), request.discountValue(),
                request.maxRedemptions(), request.startsAt(), request.endsAt());
        return id;
    }

    public Optional<PromotionRecord> lock(UUID promotionId) {
        return jdbc.query("select id,course_id,name,code,discount_type,discount_value,max_redemptions,starts_at,ends_at,enabled from course_promotions where id=? for update",
                (rs, rowNum) -> new PromotionRecord(rs.getObject("id", UUID.class), rs.getObject("course_id", UUID.class),
                        rs.getString("name"), rs.getString("code"), rs.getString("discount_type"), rs.getBigDecimal("discount_value"),
                        (Integer) rs.getObject("max_redemptions"), rs.getObject("starts_at", OffsetDateTime.class),
                        rs.getObject("ends_at", OffsetDateTime.class), rs.getBoolean("enabled")), promotionId).stream().findFirst();
    }

    public void update(UUID id, PromotionRequest request, String code, boolean enabled) {
        jdbc.update("update course_promotions set name=?,code=?,discount_type=?,discount_value=?,max_redemptions=?,starts_at=?,ends_at=?,enabled=?,updated_at=current_timestamp where id=?",
                request.name().trim(), code, request.discountType(), request.discountValue(), request.maxRedemptions(),
                request.startsAt(), request.endsAt(), enabled, id);
    }

    public boolean hasReservationOrRedemption(UUID promotionId) {
        Boolean exists = jdbc.queryForObject("select exists(select 1 from promotion_redemptions where promotion_id=?)",
                Boolean.class, promotionId);
        return Boolean.TRUE.equals(exists);
    }

    public long countCapacityUsage(UUID promotionId) {
        Long count = jdbc.queryForObject("""
                select count(*) from promotion_redemptions
                where promotion_id = ? and (status = 'REDEEMED' or (status = 'RESERVED' and reserved_until > current_timestamp))
                """, Long.class, promotionId);
        return count == null ? 0 : count;
    }

    public Optional<PromotionRecord> lockByCode(String code) {
        return jdbc.query("select id,course_id,name,code,discount_type,discount_value,max_redemptions,starts_at,ends_at,enabled from course_promotions where code=? for update",
                (rs, rowNum) -> new PromotionRecord(rs.getObject("id", UUID.class), rs.getObject("course_id", UUID.class),
                        rs.getString("name"), rs.getString("code"), rs.getString("discount_type"), rs.getBigDecimal("discount_value"),
                        (Integer) rs.getObject("max_redemptions"), rs.getObject("starts_at", OffsetDateTime.class),
                        rs.getObject("ends_at", OffsetDateTime.class), rs.getBoolean("enabled")), code).stream().findFirst();
    }

    public void insertReservation(UUID promotionId, UUID orderId, UUID itemId, UUID studentId, BigDecimal discount,
                                  OffsetDateTime reservedUntil) {
        jdbc.update("insert into promotion_redemptions(id,promotion_id,order_id,order_item_id,student_id,discount_amount,status,reserved_until) values (?,?,?,?,?,?,'RESERVED',?)",
                UUID.randomUUID(), promotionId, orderId, itemId, studentId, discount, reservedUntil);
    }

    public boolean reservationIsActive(UUID orderId) {
        Boolean active = jdbc.queryForObject("select exists(select 1 from promotion_redemptions where order_id=? and status='RESERVED' and reserved_until > current_timestamp)",
                Boolean.class, orderId);
        return Boolean.TRUE.equals(active);
    }

    public boolean redeemReservation(UUID orderId) {
        return jdbc.update("update promotion_redemptions set status='REDEEMED',redeemed_at=current_timestamp where order_id=? and status='RESERVED' and reserved_until > current_timestamp", orderId) == 1;
    }

    public void releaseReservation(UUID orderId) {
        jdbc.update("update promotion_redemptions set status='RELEASED' where order_id=? and status='RESERVED'", orderId);
    }

    private PromotionResponse map(ResultSet rs, int rowNum) throws SQLException {
        return new PromotionResponse(rs.getObject("id", UUID.class), rs.getObject("course_id", UUID.class),
                rs.getString("name"), rs.getString("code"), rs.getString("discount_type"),
                rs.getBigDecimal("discount_value"), (Integer) rs.getObject("max_redemptions"),
                rs.getLong("redeemed_count"), rs.getBigDecimal("redeemed_amount"),
                rs.getObject("starts_at", OffsetDateTime.class), rs.getObject("ends_at", OffsetDateTime.class),
                rs.getString("promotion_status"));
    }

    public record PromotionRecord(UUID id, UUID courseId, String name, String code, String discountType,
                                  BigDecimal discountValue, Integer maxRedemptions, OffsetDateTime startsAt,
                                  OffsetDateTime endsAt, boolean enabled) { }
}
