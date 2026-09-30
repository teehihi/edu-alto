package com.edualto.commerce.repository;

import com.edualto.commerce.dto.OrderResponse;
import com.edualto.commerce.dto.AdminOrderResponse;
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

    public void insertOrder(UUID orderId, UUID studentId, String phoneNumber, BigDecimal total, String status, String transferReference) {
        jdbc.update("insert into orders(id, student_id, status, currency, subtotal, total, transfer_reference, phone_number) values (?, ?, ?, 'VND', ?, ?, ?, ?)",
                orderId, studentId, status, total, total, transferReference, phoneNumber);
    }

    public void insertOrderItem(UUID orderId, CheckoutCourse course) {
        jdbc.update("insert into order_items(id, order_id, course_id, course_title, unit_price) values (?, ?, ?, ?, ?)",
                UUID.randomUUID(), orderId, course.id(), course.title(), course.price());
    }

    public void insertPayment(UUID paymentId, UUID orderId, String provider, long amountMinorUnits) {
        jdbc.update("insert into payments(id, order_id, provider, provider_txn_ref, amount_minor_units, status) values (?, ?, ?, ?, ?, 'PENDING')",
                paymentId, orderId, provider, orderId.toString(), amountMinorUnits);
    }

    public Optional<OrderResponse> findOrder(UUID orderId, UUID studentId) {
        List<OrderHeader> headers = jdbc.query("""
                select id, status, currency, total, created_at
                from orders where id = ? and student_id = ?
                """, (rs, rowNum) -> new OrderHeader(rs.getObject("id", UUID.class), rs.getString("status"),
                rs.getString("currency"), rs.getBigDecimal("total"), rs.getObject("created_at", OffsetDateTime.class)),
                orderId, studentId);
        if (headers.isEmpty()) {
            return Optional.empty();
        }
        OrderHeader header = headers.getFirst();
        List<OrderResponse.OrderItemResponse> items = jdbc.query("""
                select course_id, course_title, unit_price from order_items where order_id = ? order by id
                """, (rs, rowNum) -> new OrderResponse.OrderItemResponse(rs.getObject("course_id", UUID.class),
                rs.getString("course_title"), rs.getBigDecimal("unit_price")), orderId);
        return Optional.of(new OrderResponse(header.id(), header.status(), header.currency(), header.total(),
                header.createdAt(), items));
    }

    public Optional<PaymentOrder> lockPaymentOrder(String txnRef) {
        List<PaymentOrder> rows = jdbc.query("""
                select p.order_id, p.amount_minor_units, p.status as payment_status, p.provider,
                       o.status as order_status, o.student_id
                from payments p join orders o on o.id = p.order_id
                where p.provider_txn_ref = ?
                for update of p, o
                """, (rs, rowNum) -> new PaymentOrder(rs.getObject("order_id", UUID.class),
                rs.getLong("amount_minor_units"), rs.getString("payment_status"), rs.getString("provider"), rs.getString("order_status"),
                rs.getObject("student_id", UUID.class)), txnRef);
        return rows.stream().findFirst();
    }

    public void markPaymentFailed(UUID orderId) {
        jdbc.update("update payments set status = 'FAILED', updated_at = current_timestamp where order_id = ? and status = 'PENDING'", orderId);
        jdbc.update("update orders set status = 'PAYMENT_FAILED', updated_at = current_timestamp where id = ? and status = 'PENDING_PAYMENT'", orderId);
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

    public List<AdminOrderResponse> findAdminOrders(String status, int limit, long offset) {
        return jdbc.query("""
                select o.id, o.status, p.provider, o.transfer_reference, o.student_id, u.full_name,
                       o.total, o.currency, o.created_at
                from orders o join users u on u.id = o.student_id
                join payments p on p.order_id = o.id
                where (cast(? as varchar) is null or o.status = ?)
                order by o.created_at desc, o.id
                limit ? offset ?
                """, (rs, rowNum) -> new AdminOrderResponse(
                rs.getObject("id", UUID.class), rs.getString("status"), rs.getString("provider"),
                rs.getString("transfer_reference"), rs.getObject("student_id", UUID.class),
                rs.getString("full_name"), rs.getBigDecimal("total"), rs.getString("currency"),
                rs.getObject("created_at", OffsetDateTime.class)), status, status, limit, offset);
    }

    public long countAdminOrders(String status) {
        Long count = jdbc.queryForObject("select count(*) from orders where (cast(? as varchar) is null or status = ?)",
                Long.class, status, status);
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

    private record OrderHeader(UUID id, String status, String currency, BigDecimal total, OffsetDateTime createdAt) {
    }

    public record CheckoutCourse(UUID id, UUID instructorId, String title, BigDecimal price, String status) {
    }

    public record PaymentOrder(UUID orderId, long amountMinorUnits, String paymentStatus, String provider,
                               String orderStatus, UUID studentId) {
    }
}
