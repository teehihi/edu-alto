package com.edualto.commerce.service;

import com.edualto.commerce.config.VnPayProperties;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.dto.AdminOrderResponse;
import com.edualto.commerce.dto.ConfirmManualPaymentRequest;
import com.edualto.commerce.dto.CreateOrderRequest;
import com.edualto.commerce.dto.OrderCreatedResponse;
import com.edualto.commerce.dto.OrderResponse;
import com.edualto.commerce.repository.CommerceRepository;
import com.edualto.commerce.repository.CommerceRepository.CheckoutCourse;
import com.edualto.commerce.repository.CommerceRepository.PaymentOrder;
import com.edualto.commerce.repository.PromotionRepository;
import com.edualto.commerce.repository.PromotionRepository.PromotionRecord;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommerceService {
    private static final DateTimeFormatter VNPAY_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final CommerceRepository repository;
    private final UserService users;
    private final VnPayProperties properties;
    private final PromotionRepository promotions;

    public CommerceService(CommerceRepository repository, UserService users, VnPayProperties properties,
                           PromotionRepository promotions) {
        this.repository = repository;
        this.users = users;
        this.properties = properties;
        this.promotions = promotions;
    }

    @Transactional
    public OrderCreatedResponse createOrder(UUID studentId, CreateOrderRequest request, String clientIp) {
        users.requireActiveLearner(studentId);
        if (request.paymentMethod() == PaymentMethod.VNPAY) {
            requireGatewayConfigured();
        }
        if (request.courseIds().stream().distinct().count() != request.courseIds().size()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "DUPLICATE_COURSE", "Giỏ hàng có khóa học bị trùng");
        }
        var courses = new ArrayList<CheckoutCourse>();
        for (UUID courseId : request.courseIds()) {
            CheckoutCourse course = repository.lockCourse(courseId)
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
            if (!"PUBLISHED".equals(course.status())) {
                throw new BusinessException(HttpStatus.CONFLICT, "COURSE_NOT_AVAILABLE", "Khóa học hiện không mở bán");
            }
            if (course.instructorId().equals(studentId)) {
                throw new BusinessException(HttpStatus.CONFLICT, "OWN_COURSE_PURCHASE", "Bạn không thể mua khóa học do mình giảng dạy");
            }
            if (course.price().signum() <= 0) {
                throw new BusinessException(HttpStatus.CONFLICT, "FREE_COURSE_CHECKOUT", "Khóa học miễn phí không cần thanh toán");
            }
            if (repository.isEnrolled(studentId, courseId)) {
                throw new BusinessException(HttpStatus.CONFLICT, "ALREADY_ENROLLED", "Bạn đã tham gia một khóa học trong giỏ hàng");
            }
            courses.add(course);
        }
        PromotionRecord promotion = null;
        CheckoutCourse promotionCourse = null;
        BigDecimal itemDiscount = BigDecimal.ZERO;
        if (request.promotionCode() != null && !request.promotionCode().isBlank()) {
            String normalizedCode = request.promotionCode().trim().toUpperCase(Locale.ROOT);
            PromotionRecord lockedPromotion = promotions.lockByCode(normalizedCode)
                    .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "PROMOTION_INVALID", "Mã khuyến mãi không hợp lệ"));
            promotion = lockedPromotion;
            promotionCourse = courses.stream().filter(course -> course.id().equals(lockedPromotion.courseId())).findFirst()
                    .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "PROMOTION_COURSE_NOT_IN_CART", "Khóa học áp dụng mã chưa có trong giỏ hàng"));
            OffsetDateTime now = OffsetDateTime.now();
            if (!promotion.enabled() || now.isBefore(promotion.startsAt()) || !now.isBefore(promotion.endsAt())) {
                throw new BusinessException(HttpStatus.CONFLICT, "PROMOTION_NOT_ACTIVE", "Mã khuyến mãi hiện không áp dụng được");
            }
            if (promotion.maxRedemptions() != null && promotions.countCapacityUsage(promotion.id()) >= promotion.maxRedemptions()) {
                throw new BusinessException(HttpStatus.CONFLICT, "PROMOTION_EXHAUSTED", "Mã khuyến mãi đã hết lượt sử dụng");
            }
            itemDiscount = "PERCENT".equals(promotion.discountType())
                    ? promotionCourse.price().multiply(promotion.discountValue()).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                    : promotion.discountValue();
            BigDecimal maxDiscount = promotionCourse.price().subtract(BigDecimal.ONE).max(BigDecimal.ZERO);
            itemDiscount = itemDiscount.min(maxDiscount);
            if (itemDiscount.signum() <= 0) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PROMOTION_DISCOUNT", "Mức giảm phải lớn hơn 0 đồng");
            }
        }
        BigDecimal subtotal = courses.stream().map(CheckoutCourse::price).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discountTotal = itemDiscount;
        BigDecimal total = subtotal.subtract(discountTotal);
        if (total.signum() <= 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PROMOTION_TOTAL", "Tổng thanh toán phải lớn hơn 0 đồng");
        }
        long amountMinorUnits;
        try {
            amountMinorUnits = total.movePointRight(2).longValueExact();
            if (request.paymentMethod() != PaymentMethod.VNPAY) {
                total.setScale(0, RoundingMode.UNNECESSARY).longValueExact();
            }
        } catch (ArithmeticException exception) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COURSE_PRICE", "Giá khóa học không hợp lệ cho thanh toán VND");
        }
        UUID orderId = UUID.randomUUID();
        String transferReference = manualTransferReference(orderId);
        boolean manual = request.paymentMethod() != PaymentMethod.VNPAY;
        String orderStatus = manual ? "PAYMENT_REVIEW" : "PENDING_PAYMENT";
        OffsetDateTime expiresAt = promotion == null ? null : OffsetDateTime.now().plusMinutes(manual ? 24 * 60 : 15);
        repository.insertOrder(orderId, studentId, request.phoneNumber(), subtotal, discountTotal, total,
                orderStatus, transferReference, expiresAt);
        for (CheckoutCourse course : courses) {
            BigDecimal discount = course.equals(promotionCourse) ? itemDiscount : BigDecimal.ZERO;
            UUID itemId = repository.insertOrderItem(orderId, course, course.price().subtract(discount), discount,
                    discount.signum() > 0 ? promotion.id() : null, discount.signum() > 0 ? promotion.code() : null);
            if (discount.signum() > 0) {
                promotions.insertReservation(promotion.id(), orderId, itemId, studentId, discount, expiresAt);
            }
        }
        repository.insertPayment(UUID.randomUUID(), orderId, request.paymentMethod().name(), amountMinorUnits);
        String paymentUrl = request.paymentMethod() == PaymentMethod.VNPAY
                ? buildPaymentUrl(orderId, amountMinorUnits, clientIp, expiresAt) : null;
        OrderCreatedResponse.ManualPaymentInstructions instructions = manual
                ? createManualInstructions(request.paymentMethod(), total, transferReference) : null;
        return new OrderCreatedResponse(orderId, orderStatus, "VND", subtotal, discountTotal, total,
                request.paymentMethod().name(), paymentUrl, expiresAt, instructions);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID studentId, UUID orderId) {
        users.requireActiveLearner(studentId);
        return repository.findOrder(orderId, studentId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng"));
    }

    @Transactional(readOnly = true)
    public Page<AdminOrderResponse> listAdminOrders(
            UUID adminId, int page, int size, String status
    ) {
        users.requireActiveAdmin(adminId);
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang đơn hàng không hợp lệ");
        }
        if (status != null && !Set.of("PENDING_PAYMENT", "PAYMENT_REVIEW", "PAID", "PAYMENT_FAILED").contains(status)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ORDER_STATUS", "Trạng thái đơn hàng không hợp lệ");
        }
        long total = repository.countAdminOrders(status);
        var content = repository.findAdminOrders(status, size, (long) page * size);
        return new PageImpl<>(content, PageRequest.of(page, size), total);
    }

    @Transactional
    public OrderResponse confirmManualPayment(UUID adminId, UUID orderId, ConfirmManualPaymentRequest request) {
        users.requireActiveAdmin(adminId);
        PaymentOrder payment = repository.lockPaymentOrder(orderId.toString())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng"));
        if ("VNPAY".equals(payment.provider())) {
            throw new BusinessException(HttpStatus.CONFLICT, "GATEWAY_PAYMENT_CANNOT_BE_MANUAL", "Không thể xác nhận thủ công giao dịch VNPay");
        }
        if (!"PAYMENT_REVIEW".equals(payment.orderStatus()) || !"PENDING".equals(payment.paymentStatus())) {
            throw new BusinessException(HttpStatus.CONFLICT, "ORDER_NOT_PENDING_REVIEW", "Đơn hàng không còn chờ xác nhận thủ công");
        }
        if (repository.orderHasPromotion(orderId) && !promotions.reservationIsActive(orderId)) {
            repository.markPaymentReview(orderId, "PROMOTION_RESERVATION_EXPIRED");
            promotions.releaseReservation(orderId);
            return repository.findOrder(orderId, payment.studentId()).orElseThrow();
        }
        if (repository.orderHasPromotion(orderId) && !promotions.redeemReservation(orderId)) {
            repository.markPaymentReview(orderId, "PROMOTION_RESERVATION_EXPIRED");
            promotions.releaseReservation(orderId);
            return repository.findOrder(orderId, payment.studentId()).orElseThrow();
        }
        repository.confirmManualPayment(orderId, payment.studentId(), adminId, request.receiptReference().trim());
        return repository.findOrder(orderId, payment.studentId()).orElseThrow();
    }

    @Transactional
    public OrderResponse confirmCapturedPayment(UUID adminId, UUID orderId, ConfirmManualPaymentRequest request) {
        users.requireActiveAdmin(adminId);
        PaymentOrder payment = repository.lockPaymentOrder(orderId.toString())
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng"));
        if (!"PAYMENT_REVIEW".equals(payment.orderStatus()) || !"REVIEW".equals(payment.paymentStatus())) {
            throw new BusinessException(HttpStatus.CONFLICT, "ORDER_NOT_IN_PAYMENT_REVIEW", "Đơn hàng không cần xác minh thanh toán trễ");
        }
        repository.confirmCapturedPayment(orderId, payment.studentId(), adminId, request.receiptReference().trim());
        return repository.findOrder(orderId, payment.studentId()).orElseThrow();
    }

    @Transactional
    public IpNResult processIpn(Map<String, String> parameters) {
        if (!properties.isConfigured() || !isValidSignature(parameters)) {
            return new IpNResult("97", "Checksum invalid");
        }
        String txnRef = parameters.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            return new IpNResult("01", "Order not found");
        }
        PaymentOrder payment = repository.lockPaymentOrder(txnRef).orElse(null);
        if (payment == null) {
            return new IpNResult("01", "Order not found");
        }
        if (!"VNPAY".equals(payment.provider())) {
            return new IpNResult("01", "Order not found");
        }
        long callbackAmount;
        try {
            callbackAmount = Long.parseLong(parameters.getOrDefault("vnp_Amount", ""));
        } catch (NumberFormatException exception) {
            return new IpNResult("04", "Invalid amount");
        }
        if (callbackAmount != payment.amountMinorUnits()) {
            return new IpNResult("04", "Invalid amount");
        }
        if ("PAID".equals(payment.paymentStatus()) && "PAID".equals(payment.orderStatus())) {
            return new IpNResult("00", "Confirm Success");
        }
        if (!"PENDING".equals(payment.paymentStatus()) || !"PENDING_PAYMENT".equals(payment.orderStatus())) {
            return new IpNResult("02", "Order already confirmed");
        }
        boolean success = "00".equals(parameters.get("vnp_ResponseCode"))
                && "00".equals(parameters.get("vnp_TransactionStatus"));
        if (success) {
            if (repository.orderHasPromotion(payment.orderId()) && !promotions.reservationIsActive(payment.orderId())) {
                repository.markPaymentReview(payment.orderId(), "PROMOTION_RESERVATION_EXPIRED");
                promotions.releaseReservation(payment.orderId());
                return new IpNResult("00", "Payment needs admin reconciliation");
            }
            if (repository.orderHasPromotion(payment.orderId()) && !promotions.redeemReservation(payment.orderId())) {
                repository.markPaymentReview(payment.orderId(), "PROMOTION_RESERVATION_EXPIRED");
                promotions.releaseReservation(payment.orderId());
                return new IpNResult("00", "Payment needs admin reconciliation");
            }
            repository.markPaymentPaid(payment.orderId(), payment.studentId());
        } else {
            repository.markPaymentFailed(payment.orderId());
            promotions.releaseReservation(payment.orderId());
        }
        return new IpNResult("00", "Confirm Success");
    }

    private String buildPaymentUrl(UUID orderId, long amountMinorUnits, String clientIp, OffsetDateTime reservationExpiresAt) {
        ZonedDateTime now = ZonedDateTime.now(VIETNAM_ZONE);
        ZonedDateTime expiresAt = reservationExpiresAt == null
                ? now.plusMinutes(15) : reservationExpiresAt.atZoneSameInstant(VIETNAM_ZONE);
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", properties.tmnCode());
        params.put("vnp_Amount", Long.toString(amountMinorUnits));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", orderId.toString());
        params.put("vnp_OrderInfo", "Thanh toan don hang EduAlto " + orderId);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", properties.returnUrl());
        params.put("vnp_IpAddr", normalizeIp(clientIp));
        params.put("vnp_CreateDate", now.format(VNPAY_DATE));
        params.put("vnp_ExpireDate", expiresAt.format(VNPAY_DATE));
        String hashData = toQuery(params);
        params.put("vnp_SecureHash", hmacSha512(properties.hashSecret(), hashData));
        return properties.paymentUrl() + "?" + toQuery(params);
    }

    private static OrderCreatedResponse.ManualPaymentInstructions createManualInstructions(
            PaymentMethod method, BigDecimal amount, String transferReference
    ) {
        if (method == PaymentMethod.MOMO) {
            return new OrderCreatedResponse.ManualPaymentInstructions("MOMO_TRANSFER", "NGUYEN NHAT THIEN",
                    null, null, "0389037546", amount, transferReference, null);
        }
        String qrUrl = "https://img.vietqr.io/image/VCB-1040489156-compact2.png?amount="
                + amount.setScale(0, RoundingMode.UNNECESSARY).toPlainString()
                + "&addInfo=" + encode(transferReference)
                + "&accountName=" + encode("NGUYEN NHAT THIEN");
        return new OrderCreatedResponse.ManualPaymentInstructions("BANK_TRANSFER", "NGUYEN NHAT THIEN",
                "Vietcombank (VCB)", "1040489156", null, amount, transferReference, qrUrl);
    }

    private static String manualTransferReference(UUID orderId) {
        return "EA" + orderId.toString().replace("-", "").substring(0, 22).toUpperCase();
    }

    private boolean isValidSignature(Map<String, String> parameters) {
        if (!properties.tmnCode().equals(parameters.get("vnp_TmnCode"))) {
            return false;
        }
        String receivedHash = parameters.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return false;
        }
        Map<String, String> signedParams = new TreeMap<>(parameters);
        signedParams.remove("vnp_SecureHash");
        signedParams.remove("vnp_SecureHashType");
        byte[] expected = hmacSha512(properties.hashSecret(), toQuery(signedParams)).getBytes(StandardCharsets.US_ASCII);
        byte[] received = receivedHash.getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, received);
    }

    private static String toQuery(Map<String, String> params) {
        return params.entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isEmpty())
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .reduce((left, right) -> left + "&" + right).orElse("");
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String hmacSha512(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            var result = new StringBuilder(bytes.length * 2);
            for (byte value : bytes) {
                result.append(String.format("%02x", value & 0xff));
            }
            return result.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign payment request", exception);
        }
    }

    private void requireGatewayConfigured() {
        if (!properties.isConfigured()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_GATEWAY_NOT_CONFIGURED",
                    "Thanh toán trực tuyến chưa được cấu hình");
        }
    }

    private static String normalizeIp(String ip) {
        if (ip == null || ip.isBlank() || "0:0:0:0:0:0:0:1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip.length() > 45 ? ip.substring(0, 45) : ip;
    }

    public record IpNResult(String rspCode, String message) {
    }
}
