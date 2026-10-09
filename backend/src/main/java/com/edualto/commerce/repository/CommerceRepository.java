package com.edualto.commerce.repository;

import com.edualto.commerce.dto.OrderResponse;
import com.edualto.commerce.dto.AdminOrderResponse;
import com.edualto.commerce.dto.InstructorRevenueTransactionResponse;
import com.edualto.commerce.dto.InstructorRevenueSummaryResponse;
import com.edualto.commerce.dto.InstructorCourseRevenueResponse;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CommerceRepository {
    private final JdbcTemplate jdbc;

    public CommerceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<CheckoutCourse> lockCourse(UUID courseId) {
        return jdbc.query("""
                select id, instructor_id, title, price, status
                from courses where id = ? for share
                """, this::mapCourse, courseId).stream().findFirst();
    }

    public boolean isEnrolled(UUID studentId, UUID courseId) {
        Boolean enrolled = jdbc.queryForObject("select exists(select 1 from enrollments where student_id = ? and course_id = ?)",
                Boolean.class, studentId, courseId);
        return Boolean.TRUE.equals(enrolled);
    }

    public void insertOrder(UUID orderId, UUID studentId, String phoneNumber, BigDecimal subtotal,
                            BigDecimal discountTotal, BigDecimal total, String status, String transferReference,
                            OffsetDateTime expiresAt) {
        jdbc.update("insert into orders(id, student_id, status, currency, subtotal, discount_total, total, transfer_reference, phone_number, expires_at) values (?, ?, ?, 'VND', ?, ?, ?, ?, ?, ?)",
                orderId, studentId, status, subtotal, discountTotal, total, transferReference, phoneNumber, expiresAt);
    }

    public UUID insertOrderItem(UUID orderId, CheckoutCourse course, BigDecimal netPrice, BigDecimal discount,
                                UUID promotionId, String promotionCode) {
        UUID itemId = UUID.randomUUID();
        jdbc.update("insert into order_items(id, order_id, course_id, course_title, unit_price, list_price, discount_amount, promotion_id, promotion_code) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                itemId, orderId, course.id(), course.title(), netPrice, course.price(), discount, promotionId, promotionCode);
        return itemId;
    }

    public void insertPayment(UUID paymentId, UUID orderId, String provider, long amountMinorUnits) {
        insertPayment(paymentId, orderId, provider, orderId.toString(), amountMinorUnits);
    }

    public void insertPayment(UUID paymentId, UUID orderId, String provider, String providerTxnRef, long amountMinorUnits) {
        String effectiveTxnRef = providerTxnRef != null && !providerTxnRef.isBlank() ? providerTxnRef : orderId.toString();
        jdbc.update("insert into payments(id, order_id, provider, provider_txn_ref, amount_minor_units, status) values (?, ?, ?, ?, ?, 'PENDING')",
                paymentId, orderId, provider, effectiveTxnRef, amountMinorUnits);
    }

    public Optional<OrderResponse> findOrder(UUID orderId, UUID studentId) {
        List<OrderHeader> headers = jdbc.query("""
                select id, status, currency, subtotal, discount_total, total, created_at, expires_at, payment_review_reason
                from orders where id = ? and student_id = ?
                """, (rs, rowNum) -> new OrderHeader(rs.getObject("id", UUID.class), rs.getString("status"),
                rs.getString("currency"), rs.getBigDecimal("subtotal"), rs.getBigDecimal("discount_total"),
                rs.getBigDecimal("total"), rs.getObject("created_at", OffsetDateTime.class),
                rs.getObject("expires_at", OffsetDateTime.class), rs.getString("payment_review_reason")),
                orderId, studentId);
        if (headers.isEmpty()) {
            return Optional.empty();
        }
        OrderHeader header = headers.getFirst();
        List<OrderResponse.OrderItemResponse> items = jdbc.query("""
                select course_id, course_title, unit_price, list_price, discount_amount, promotion_code from order_items where order_id = ? order by id
                """, (rs, rowNum) -> new OrderResponse.OrderItemResponse(rs.getObject("course_id", UUID.class),
                rs.getString("course_title"), rs.getBigDecimal("unit_price"), rs.getBigDecimal("list_price"),
                rs.getBigDecimal("discount_amount"), rs.getString("promotion_code")), orderId);
        return Optional.of(new OrderResponse(header.id(), header.status(), header.currency(), header.subtotal(),
                header.discountTotal(), header.total(),
                header.createdAt(), header.expiresAt(), header.paymentReviewReason(), items));
    }

    public Optional<PaymentOrder> lockPaymentOrder(String txnRef) {
        List<PaymentOrder> rows = jdbc.query("""
                select p.order_id, p.amount_minor_units, p.status as payment_status, p.provider,
                       o.status as order_status, o.student_id
                from payments p join orders o on o.id = p.order_id
                where p.provider_txn_ref = ? or cast(o.id as varchar) = ? or o.transfer_reference = ?
                for update of p, o
                """, (rs, rowNum) -> new PaymentOrder(rs.getObject("order_id", UUID.class),
                rs.getLong("amount_minor_units"), rs.getString("payment_status"), rs.getString("provider"), rs.getString("order_status"),
                rs.getObject("student_id", UUID.class)), txnRef, txnRef, txnRef);
        return rows.stream().findFirst();
    }

    public void markPaymentFailed(UUID orderId) {
        jdbc.update("update payments set status = 'FAILED', updated_at = current_timestamp where order_id = ? and status in ('PENDING','REVIEW')", orderId);
        jdbc.update("update orders set status = 'PAYMENT_FAILED', updated_at = current_timestamp where id = ? and status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW')", orderId);
    }

    public List<UUID> lockExpiredPendingOrders(int limit) {
        return jdbc.query("""
                select o.id
                from orders o
                join payments p on p.order_id = o.id
                where o.status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW')
                  and p.status = 'PENDING'
                  and o.expires_at is not null
                  and o.expires_at <= current_timestamp
                order by o.expires_at, o.id
                limit ?
                for update of p, o skip locked
                """, (rs, rowNum) -> rs.getObject("id", UUID.class), limit);
    }

    public void markLatePaymentReview(UUID orderId, String reason) {
        jdbc.update("update payments set status='REVIEW',updated_at=current_timestamp where order_id=? and status='FAILED'", orderId);
        jdbc.update("update orders set status='PAYMENT_REVIEW',payment_review_reason=?,updated_at=current_timestamp where id=? and status='PAYMENT_FAILED'",
                reason, orderId);
    }

    public void markPaymentReview(UUID orderId, String reason) {
        jdbc.update("update payments set status='REVIEW',updated_at=current_timestamp where order_id=? and status='PENDING'", orderId);
        jdbc.update("update orders set status='PAYMENT_REVIEW',payment_review_reason=?,updated_at=current_timestamp where id=? and status in ('PENDING_PAYMENT','PAYMENT_REVIEW')",
                reason, orderId);
    }

    public boolean orderHasPromotion(UUID orderId) {
        Boolean exists = jdbc.queryForObject("select exists(select 1 from promotion_redemptions where order_id=?)",
                Boolean.class, orderId);
        return Boolean.TRUE.equals(exists);
    }

    public void markPaymentPaid(UUID orderId, UUID studentId) {
        jdbc.update("update payments set status = 'PAID', paid_at = current_timestamp, updated_at = current_timestamp where order_id = ? and status = 'PENDING'", orderId);
        jdbc.update("update orders set status = 'PAID', updated_at = current_timestamp where id = ? and status = 'PENDING_PAYMENT'", orderId);
        insertEnrollmentForOrder(orderId, studentId);
    }

    public void confirmManualPayment(UUID orderId, UUID studentId, UUID adminId, String receiptReference) {
        jdbc.update("update payments set status = 'PAID', paid_at = current_timestamp, updated_at = current_timestamp where order_id = ? and status = 'PENDING'",
                orderId);
        jdbc.update("update orders set status = 'PAID', updated_at = current_timestamp where id = ? and status = 'PAYMENT_REVIEW'",
                orderId);
        jdbc.update("insert into manual_payment_confirmations(id, payment_id, confirmed_by, receipt_reference) "
                        + "select ?, id, ?, ? from payments where order_id = ?",
                UUID.randomUUID(), adminId, receiptReference, orderId);
        insertEnrollmentForOrder(orderId, studentId);
    }

    public void confirmCapturedPayment(UUID orderId, UUID studentId, UUID adminId, String receiptReference) {
        jdbc.update("update payments set status='PAID',paid_at=current_timestamp,updated_at=current_timestamp where order_id=? and status='REVIEW'", orderId);
        jdbc.update("update orders set status='PAID',updated_at=current_timestamp where id=? and status='PAYMENT_REVIEW'", orderId);
        jdbc.update("insert into manual_payment_confirmations(id,payment_id,confirmed_by,receipt_reference) "
                        + "select ?,id,?,? from payments where order_id=?",
                UUID.randomUUID(), adminId, receiptReference, orderId);
        jdbc.update("update promotion_redemptions set status='REDEEMED',redeemed_at=current_timestamp where order_id=? and status='RELEASED'",
                orderId);
        insertEnrollmentForOrder(orderId, studentId);
    }

    public List<AdminOrderResponse> findAdminOrders(String status, int limit, long offset) {
        return jdbc.query("""
                select o.id, o.status, p.provider, o.transfer_reference, o.student_id, u.full_name,
                       o.total, o.currency, o.created_at, p.status as payment_status, o.expires_at, o.payment_review_reason
                from orders o join users u on u.id = o.student_id
                join payments p on p.order_id = o.id
                where (cast(? as varchar) is null or o.status = ?)
                order by o.created_at desc, o.id
                limit ? offset ?
                """, (rs, rowNum) -> new AdminOrderResponse(
                rs.getObject("id", UUID.class), rs.getString("status"), rs.getString("provider"),
                rs.getString("transfer_reference"), rs.getObject("student_id", UUID.class),
                rs.getString("full_name"), rs.getBigDecimal("total"), rs.getString("currency"),
                rs.getObject("created_at", OffsetDateTime.class), rs.getString("payment_status"),
                rs.getObject("expires_at", OffsetDateTime.class), rs.getString("payment_review_reason")), status, status, limit, offset);
    }

    public long countAdminOrders(String status) {
        Long count = jdbc.queryForObject("select count(*) from orders where (cast(? as varchar) is null or status = ?)",
                Long.class, status, status);
        return count == null ? 0 : count;
    }

    public boolean ownsCourse(UUID instructorId, UUID courseId) {
        Boolean exists = jdbc.queryForObject(
                "select exists(select 1 from courses where id=? and instructor_id=?)", Boolean.class, courseId, instructorId);
        return Boolean.TRUE.equals(exists);
    }

    public BigDecimal sumInstructorPaidNet(UUID instructorId, OffsetDateTime from, OffsetDateTime to) {
        BigDecimal total = jdbc.queryForObject("""
                select coalesce(sum(oi.unit_price), 0)
                from order_items oi
                join orders o on o.id = oi.order_id
                join payments p on p.order_id = o.id
                join courses c on c.id = oi.course_id
                where c.instructor_id = ?
                  and o.status = 'PAID'
                  and p.status = 'PAID'
                  and (cast(? as timestamptz) is null or o.created_at >= ?)
                  and (cast(? as timestamptz) is null or o.created_at < ?)
                """, BigDecimal.class, instructorId, from, from, to, to);
        return total == null ? BigDecimal.ZERO : total;
    }

    public long countInstructorPaidTransactions(UUID instructorId, OffsetDateTime from, OffsetDateTime to) {
        Long count = jdbc.queryForObject("""
                select count(*)
                from order_items oi
                join orders o on o.id = oi.order_id
                join payments p on p.order_id = o.id
                join courses c on c.id = oi.course_id
                where c.instructor_id = ?
                  and o.status = 'PAID'
                  and p.status = 'PAID'
                  and (cast(? as timestamptz) is null or o.created_at >= ?)
                  and (cast(? as timestamptz) is null or o.created_at < ?)
                """, Long.class, instructorId, from, from, to, to);
        return count == null ? 0 : count;
    }

    public long countInstructorPendingTransactions(UUID instructorId, OffsetDateTime from, OffsetDateTime to) {
        Long count = jdbc.queryForObject("""
                select count(distinct o.id)
                from order_items oi
                join orders o on o.id = oi.order_id
                join payments p on p.order_id = o.id
                join courses c on c.id = oi.course_id
                where c.instructor_id = ?
                  and o.status in ('PENDING_PAYMENT', 'PAYMENT_REVIEW')
                  and p.status = 'PENDING'
                  and (cast(? as timestamptz) is null or o.created_at >= ?)
                  and (cast(? as timestamptz) is null or o.created_at < ?)
                """, Long.class, instructorId, from, from, to, to);
        return count == null ? 0 : count;
    }

    public List<InstructorRevenueSummaryResponse.Period> findInstructorPaidNetByMonth(
            UUID instructorId,
            LocalDateTime firstMonth,
            LocalDateTime nextMonth
    ) {
        return jdbc.query("""
                with months as (
                    select generate_series(
                        cast(? as timestamp without time zone),
                        cast(? as timestamp without time zone) - interval '1 month',
                        interval '1 month'
                    ) as month_start
                ), paid_sales as (
                    select date_trunc('month', o.created_at at time zone 'Asia/Ho_Chi_Minh') as month_start,
                           sum(oi.unit_price) as net_amount
                    from order_items oi
                    join orders o on o.id = oi.order_id
                    join payments p on p.order_id = o.id
                    join courses c on c.id = oi.course_id
                    where c.instructor_id = ?
                      and o.status = 'PAID'
                      and p.status = 'PAID'
                      and o.created_at >= ((cast(? as timestamp without time zone) - interval '1 year') at time zone 'Asia/Ho_Chi_Minh')
                      and o.created_at < (cast(? as timestamp without time zone) at time zone 'Asia/Ho_Chi_Minh')
                    group by date_trunc('month', o.created_at at time zone 'Asia/Ho_Chi_Minh')
                )
                select to_char(months.month_start, 'YYYY-MM') as label,
                       coalesce(current_sales.net_amount, 0) as net_amount,
                       coalesce(previous_sales.net_amount, 0) as previous_net_amount
                from months
                left join paid_sales current_sales on current_sales.month_start = months.month_start
                left join paid_sales previous_sales on previous_sales.month_start = months.month_start - interval '1 year'
                order by months.month_start
                """, (rs, rowNum) -> new InstructorRevenueSummaryResponse.Period(
                rs.getString("label"), rs.getBigDecimal("net_amount"), rs.getBigDecimal("previous_net_amount")),
                firstMonth, nextMonth, instructorId, firstMonth, nextMonth);
    }

    public InstructorCourseRevenueResponse findCourseRevenueSummary(
            UUID instructorId, UUID courseId, LocalDateTime firstMonth, LocalDateTime nextMonth
    ) {
        CourseRevenueTotals totals = jdbc.queryForObject("""
                select coalesce(sum(oi.unit_price) filter (where o.status='PAID' and p.status='PAID'),0) as paid_net_amount,
                       count(*) filter (where o.status='PAID' and p.status='PAID') as paid_count,
                       count(distinct o.id) filter (where o.status in ('PENDING_PAYMENT','PAYMENT_REVIEW') and p.status='PENDING') as pending_count
                from order_items oi
                join orders o on o.id=oi.order_id
                join payments p on p.order_id=o.id
                join courses c on c.id=oi.course_id
                where c.instructor_id=? and c.id=?
                """, (rs, rowNum) -> new CourseRevenueTotals(
                rs.getBigDecimal("paid_net_amount"), rs.getLong("paid_count"), rs.getLong("pending_count")),
                instructorId, courseId);
        List<InstructorRevenueSummaryResponse.Period> periods = jdbc.query("""
                with months as (
                    select generate_series(cast(? as timestamp without time zone),
                        cast(? as timestamp without time zone) - interval '1 month', interval '1 month') as month_start
                ), paid_sales as (
                    select date_trunc('month', o.created_at at time zone 'Asia/Ho_Chi_Minh') as month_start,
                           sum(oi.unit_price) as net_amount
                    from order_items oi
                    join orders o on o.id=oi.order_id
                    join payments p on p.order_id=o.id
                    where oi.course_id=? and o.status='PAID' and p.status='PAID'
                      and o.created_at >= ((cast(? as timestamp without time zone) - interval '1 year') at time zone 'Asia/Ho_Chi_Minh')
                      and o.created_at < (cast(? as timestamp without time zone) at time zone 'Asia/Ho_Chi_Minh')
                    group by date_trunc('month', o.created_at at time zone 'Asia/Ho_Chi_Minh')
                )
                select to_char(months.month_start,'YYYY-MM') as label,
                       coalesce(current_sales.net_amount,0) as net_amount,
                       coalesce(previous_sales.net_amount,0) as previous_net_amount
                from months
                left join paid_sales current_sales on current_sales.month_start=months.month_start
                left join paid_sales previous_sales on previous_sales.month_start=months.month_start - interval '1 year'
                order by months.month_start
                """, (rs, rowNum) -> new InstructorRevenueSummaryResponse.Period(
                rs.getString("label"), rs.getBigDecimal("net_amount"), rs.getBigDecimal("previous_net_amount")),
                firstMonth, nextMonth, courseId, firstMonth, nextMonth);
        return new InstructorCourseRevenueResponse(
                totals.paidNetAmount(), totals.paidTransactionCount(), totals.pendingTransactionCount(), periods);
    }

    private record CourseRevenueTotals(BigDecimal paidNetAmount, long paidTransactionCount, long pendingTransactionCount) {
    }

    public List<InstructorRevenueTransactionResponse> findInstructorTransactions(
            UUID instructorId,
            OffsetDateTime from,
            OffsetDateTime to,
            String search,
            String status,
            int limit,
            long offset
    ) {
        return jdbc.query("""
                select o.id as order_id, c.id as course_id, oi.course_title, u.full_name as student_name,
                       oi.unit_price as amount, o.status, p.provider as payment_method, o.created_at
                from order_items oi
                join orders o on o.id = oi.order_id
                join payments p on p.order_id = o.id
                join courses c on c.id = oi.course_id
                join users u on u.id = o.student_id
                where c.instructor_id = ?
                  and (cast(? as timestamptz) is null or o.created_at >= ?)
                  and (cast(? as timestamptz) is null or o.created_at < ?)
                  and (cast(? as varchar) is null or o.status = ?)
                  and (cast(? as varchar) is null or oi.course_title ilike '%' || ? || '%'
                       or u.full_name ilike '%' || ? || '%'
                       or cast(o.id as varchar) ilike '%' || ? || '%')
                order by o.created_at desc, o.id, oi.id
                limit ? offset ?
                """, (rs, rowNum) -> new InstructorRevenueTransactionResponse(
                rs.getObject("order_id", UUID.class),
                rs.getObject("course_id", UUID.class),
                rs.getString("course_title"),
                rs.getString("student_name"),
                rs.getBigDecimal("amount"),
                rs.getString("status"),
                rs.getString("payment_method"),
                rs.getObject("created_at", OffsetDateTime.class)),
                instructorId, from, from, to, to, status, status,
                search, search, search, search, limit, offset);
    }

    public long countInstructorTransactions(
            UUID instructorId,
            OffsetDateTime from,
            OffsetDateTime to,
            String search,
            String status
    ) {
        Long count = jdbc.queryForObject("""
                select count(*)
                from order_items oi
                join orders o on o.id = oi.order_id
                join payments p on p.order_id = o.id
                join courses c on c.id = oi.course_id
                join users u on u.id = o.student_id
                where c.instructor_id = ?
                  and (cast(? as timestamptz) is null or o.created_at >= ?)
                  and (cast(? as timestamptz) is null or o.created_at < ?)
                  and (cast(? as varchar) is null or o.status = ?)
                  and (cast(? as varchar) is null or oi.course_title ilike '%' || ? || '%'
                       or u.full_name ilike '%' || ? || '%'
                       or cast(o.id as varchar) ilike '%' || ? || '%')
                """, Long.class, instructorId, from, from, to, to, status, status,
                search, search, search, search);
        return count == null ? 0 : count;
    }

    private void insertEnrollmentForOrder(UUID orderId, UUID studentId) {
        List<UUID> courseIds = jdbc.query("select course_id from order_items where order_id = ?",
                (rs, rowNum) -> rs.getObject("course_id", UUID.class), orderId);
        courseIds.forEach(courseId -> jdbc.update("""
                insert into enrollments(id, student_id, course_id, status, enrolled_at, created_at, updated_at)
                values (?, ?, ?, 'ACTIVE', current_timestamp, current_timestamp, current_timestamp)
                on conflict (student_id, course_id) do nothing
                """, UUID.randomUUID(), studentId, courseId));
    }

    private CheckoutCourse mapCourse(ResultSet rs, int rowNum) throws SQLException {
        return new CheckoutCourse(rs.getObject("id", UUID.class), rs.getObject("instructor_id", UUID.class),
                rs.getString("title"), rs.getBigDecimal("price"), rs.getString("status"));
    }

    private record OrderHeader(UUID id, String status, String currency, BigDecimal subtotal,
                               BigDecimal discountTotal, BigDecimal total, OffsetDateTime createdAt,
                               OffsetDateTime expiresAt, String paymentReviewReason) {
    }

    public record CheckoutCourse(UUID id, UUID instructorId, String title, BigDecimal price, String status) {
    }

    public record PaymentOrder(UUID orderId, long amountMinorUnits, String paymentStatus, String provider,
                               String orderStatus, UUID studentId) {
    }
}
