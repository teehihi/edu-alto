package com.edualto.commerce;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.config.VnPayProperties;
import com.edualto.commerce.dto.ConfirmManualPaymentRequest;
import com.edualto.commerce.dto.CreateOrderRequest;
import com.edualto.commerce.dto.OrderCreatedResponse;
import com.edualto.commerce.dto.OrderResponse;
import com.edualto.commerce.repository.CommerceRepository;
import com.edualto.commerce.repository.CommerceRepository.PaymentOrder;
import com.edualto.commerce.repository.PromotionRepository;
import com.edualto.commerce.repository.PromotionRepository.PromotionRecord;
import com.edualto.commerce.service.CommerceService;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.List;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class CommerceServiceTest {
    private static final String SECRET = "unit-test-vnpay-secret";
    @Mock
    private CommerceRepository repository;
    @Mock
    private UserService users;
    @Mock
    private PromotionRepository promotions;

    @Test
    void validIpnMarksPaymentPaidAndActivatesEnrollment() {
        UUID orderId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(repository.lockPaymentOrder(orderId.toString())).thenReturn(Optional.of(
                new PaymentOrder(orderId, 25000000L, "PENDING", "VNPAY", "PENDING_PAYMENT", studentId)));
        CommerceService service = service();
        Map<String, String> params = signed(Map.of(
                "vnp_TxnRef", orderId.toString(),
                "vnp_Amount", "25000000",
                "vnp_ResponseCode", "00",
                "vnp_TransactionStatus", "00"
        ));

        CommerceService.IpNResult result = service.processIpn(params);

        assertThat(result.rspCode()).isEqualTo("00");
        verify(repository).markPaymentPaid(orderId, studentId);
        verify(repository, never()).markPaymentFailed(orderId);
    }

    @Test
    void invalidIpnSignatureDoesNotChangeOrderOrEnrollment() {
        UUID orderId = UUID.randomUUID();
        CommerceService service = service();
        Map<String, String> params = Map.of(
                "vnp_TxnRef", orderId.toString(), "vnp_Amount", "25000000",
                "vnp_ResponseCode", "00", "vnp_TransactionStatus", "00", "vnp_SecureHash", "bad"
        );

        CommerceService.IpNResult result = service.processIpn(params);

        assertThat(result.rspCode()).isEqualTo("97");
        verify(repository, never()).lockPaymentOrder(orderId.toString());
        verify(repository, never()).markPaymentPaid(any(), any());
    }

    @Test
    void validButFailedGatewayResponseMarksOrderFailed() {
        UUID orderId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(repository.lockPaymentOrder(orderId.toString())).thenReturn(Optional.of(
                new PaymentOrder(orderId, 25000000L, "PENDING", "VNPAY", "PENDING_PAYMENT", studentId)));
        Map<String, String> params = signed(Map.of(
                "vnp_TxnRef", orderId.toString(), "vnp_Amount", "25000000",
                "vnp_ResponseCode", "24", "vnp_TransactionStatus", "02"
        ));

        CommerceService.IpNResult result = service().processIpn(params);

        assertThat(result.rspCode()).isEqualTo("00");
        verify(repository).markPaymentFailed(orderId);
        verify(repository, never()).markPaymentPaid(orderId, studentId);
    }

    @Test
    void momoOrderReturnsManualInstructionsAndWaitsForReview() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        when(repository.lockCourse(courseId)).thenReturn(Optional.of(new CommerceRepository.CheckoutCourse(
                courseId, UUID.randomUUID(), "Khóa học thử", new BigDecimal("250000"), "PUBLISHED")));
        when(repository.isEnrolled(studentId, courseId)).thenReturn(false);

        OrderCreatedResponse response = service().createOrder(studentId,
                new CreateOrderRequest(List.of(courseId), PaymentMethod.MOMO, "0931652105", null), "127.0.0.1");

        assertThat(response.status()).isEqualTo("PAYMENT_REVIEW");
        assertThat(response.paymentMethod()).isEqualTo("MOMO");
        assertThat(response.paymentUrl()).isNull();
        assertThat(response.instructions().walletPhone()).isEqualTo("0389037546");
        assertThat(response.instructions().transferReference()).startsWith("EA");
        verify(repository).insertOrder(any(UUID.class), eq(studentId), eq("0931652105"),
                eq(new BigDecimal("250000")), eq(BigDecimal.ZERO), eq(new BigDecimal("250000")),
                eq("PAYMENT_REVIEW"), anyString(), isNull());
        verify(repository, never()).markPaymentPaid(any(), any());
    }

    @Test
    void vietQrOrderIncludesAmountAndUniqueReferenceInQrUrl() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        when(repository.lockCourse(courseId)).thenReturn(Optional.of(new CommerceRepository.CheckoutCourse(
                courseId, UUID.randomUUID(), "Khóa học thử", new BigDecimal("125000"), "PUBLISHED")));
        when(repository.isEnrolled(studentId, courseId)).thenReturn(false);

        OrderCreatedResponse response = service().createOrder(studentId,
                new CreateOrderRequest(List.of(courseId), PaymentMethod.VIETQR, "0931652105", null), "127.0.0.1");

        assertThat(response.instructions().bankName()).isEqualTo("Vietcombank (VCB)");
        assertThat(response.instructions().accountNumber()).isEqualTo("1040489156");
        assertThat(response.instructions().qrUrl()).contains("amount=125000").contains(response.instructions().transferReference());
        assertThat(response.status()).isEqualTo("PAYMENT_REVIEW");
    }

    @Test
    void manualConfirmationRequiresAdminAndActivatesTheOrder() {
        UUID orderId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        when(repository.lockPaymentOrder(orderId.toString())).thenReturn(Optional.of(
                new PaymentOrder(orderId, 25000000L, "PENDING", "MOMO", "PAYMENT_REVIEW", studentId)));
        OrderResponse order = new OrderResponse(orderId, "PAID", "VND", new BigDecimal("250000"),
                BigDecimal.ZERO, new BigDecimal("250000"), OffsetDateTime.now(), null, null, List.of());
        when(repository.findOrder(orderId, studentId)).thenReturn(Optional.of(order));

        OrderResponse response = service().confirmManualPayment(adminId, orderId,
                new ConfirmManualPaymentRequest("wallet-receipt-123"));

        assertThat(response.status()).isEqualTo("PAID");
        verify(users).requireActiveAdmin(adminId);
        verify(repository).confirmManualPayment(orderId, studentId, adminId, "wallet-receipt-123");
    }

    @Test
    void nonAdminCannotListOrdersOrConfirmPayments() {
        UUID userId = UUID.randomUUID();
        doThrow(new BusinessException(HttpStatus.FORBIDDEN, "ADMIN_REQUIRED", "Admin required"))
                .when(users).requireActiveAdmin(userId);

        assertThatThrownBy(() -> service().listAdminOrders(userId, 0, 20, "PAYMENT_REVIEW"))
                .isInstanceOf(BusinessException.class);
        verify(repository, never()).countAdminOrders(any());
    }

    @Test
    void promotionDiscountIsReservedAndManualPaymentUsesNetAmount() {
        UUID studentId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        UUID promotionId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        var course = new CommerceRepository.CheckoutCourse(courseId, UUID.randomUUID(),
                "Khóa học thử", new BigDecimal("250000"), "PUBLISHED");
        when(repository.lockCourse(courseId)).thenReturn(Optional.of(course));
        when(promotions.lockByCode("WELCOME20")).thenReturn(Optional.of(new PromotionRecord(
                promotionId, courseId, "Ưu đãi khóa học", "WELCOME20", "PERCENT", new BigDecimal("20"),
                10, OffsetDateTime.now().minusDays(1), OffsetDateTime.now().plusDays(1), true)));
        when(repository.insertOrderItem(any(UUID.class), eq(course), eq(new BigDecimal("200000")),
                eq(new BigDecimal("50000")), eq(promotionId), eq("WELCOME20"))).thenReturn(itemId);

        OrderCreatedResponse response = service().createOrder(studentId,
                new CreateOrderRequest(List.of(courseId), PaymentMethod.VIETQR, "0931652105", " welcome20 "),
                "127.0.0.1");

        assertThat(response.subtotal()).isEqualByComparingTo("250000");
        assertThat(response.discountTotal()).isEqualByComparingTo("50000");
        assertThat(response.total()).isEqualByComparingTo("200000");
        assertThat(response.expiresAt()).isAfter(OffsetDateTime.now().plusHours(23));
        assertThat(response.instructions().qrUrl()).contains("amount=200000");
        verify(promotions).insertReservation(promotionId, response.orderId(), itemId, studentId,
                new BigDecimal("50000"), response.expiresAt());
        verify(repository).insertPayment(any(UUID.class), eq(response.orderId()), eq("VIETQR"), eq(20000000L));
    }

    @Test
    void successfulIpnWithExpiredReservationRequiresReviewWithoutEnrollment() {
        UUID orderId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(repository.lockPaymentOrder(orderId.toString())).thenReturn(Optional.of(
                new PaymentOrder(orderId, 20000000L, "PENDING", "VNPAY", "PENDING_PAYMENT", studentId)));
        when(repository.orderHasPromotion(orderId)).thenReturn(true);

        CommerceService.IpNResult result = service().processIpn(signed(Map.of(
                "vnp_TxnRef", orderId.toString(), "vnp_Amount", "20000000",
                "vnp_ResponseCode", "00", "vnp_TransactionStatus", "00")));

        assertThat(result.rspCode()).isEqualTo("00");
        verify(repository).markPaymentReview(orderId, "PROMOTION_RESERVATION_EXPIRED");
        verify(promotions).releaseReservation(orderId);
        verify(repository, never()).markPaymentPaid(any(), any());
        verify(repository, never()).markPaymentFailed(any());
    }

    @Test
    void successfulIpnRedeemsActiveReservationAndActivatesEnrollment() {
        UUID orderId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(repository.lockPaymentOrder(orderId.toString())).thenReturn(Optional.of(
                new PaymentOrder(orderId, 20000000L, "PENDING", "VNPAY", "PENDING_PAYMENT", studentId)));
        when(repository.orderHasPromotion(orderId)).thenReturn(true);
        when(promotions.reservationIsActive(orderId)).thenReturn(true);
        when(promotions.redeemReservation(orderId)).thenReturn(true);

        CommerceService.IpNResult result = service().processIpn(signed(Map.of(
                "vnp_TxnRef", orderId.toString(), "vnp_Amount", "20000000",
                "vnp_ResponseCode", "00", "vnp_TransactionStatus", "00")));

        assertThat(result.rspCode()).isEqualTo("00");
        verify(promotions).redeemReservation(orderId);
        verify(repository).markPaymentPaid(orderId, studentId);
        verify(repository, never()).markPaymentReview(any(), any());
        verify(promotions, never()).releaseReservation(any());
    }

    private CommerceService service() {
        return new CommerceService(repository, users,
                new VnPayProperties("TESTTMNCODE", SECRET, "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                        "https://example.test/checkout/result"), promotions);
    }

    private static Map<String, String> signed(Map<String, String> values) {
        Map<String, String> params = new TreeMap<>(values);
        params.put("vnp_TmnCode", "TESTTMNCODE");
        params.put("vnp_SecureHash", hmac(toQuery(params)));
        return params;
    }

    private static String toQuery(Map<String, String> params) {
        return params.entrySet().stream()
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .reduce((left, right) -> left + "&" + right).orElse("");
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            var result = new StringBuilder();
            for (byte value : mac.doFinal(data.getBytes(StandardCharsets.UTF_8))) {
                result.append(String.format("%02x", value & 0xff));
            }
            return result.toString();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}
