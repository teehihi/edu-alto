package com.edualto.commerce.service;

import com.edualto.commerce.config.MoMoProperties;
import com.edualto.commerce.config.SepayProperties;
import com.edualto.commerce.config.StripeProperties;
import com.edualto.commerce.config.VnPayProperties;
import com.edualto.commerce.domain.PaymentMethod;
import com.edualto.commerce.dto.AdminOrderResponse;
import com.edualto.commerce.dto.ConfirmManualPaymentRequest;
import com.edualto.commerce.dto.CreateOrderRequest;
import com.edualto.commerce.dto.OrderCreatedResponse;
import com.edualto.commerce.dto.OrderResponse;
import com.edualto.commerce.gateway.PaymentGateway;
import com.edualto.commerce.gateway.PaymentGatewayRegistry;
import com.edualto.commerce.gateway.PaymentInitCommand;
import com.edualto.commerce.gateway.PaymentInitResult;
import com.edualto.commerce.gateway.PaymentWebhookCommand;
import com.edualto.commerce.gateway.PaymentWebhookResult;
import com.edualto.commerce.gateway.provider.MoMoPaymentGateway;
import com.edualto.commerce.gateway.provider.SepayPaymentGateway;
import com.edualto.commerce.gateway.provider.StripePaymentGateway;
import com.edualto.commerce.gateway.provider.VietQrPaymentGateway;
import com.edualto.commerce.gateway.provider.VnPayPaymentGateway;
import com.edualto.commerce.repository.CommerceRepository;
import com.edualto.commerce.repository.CommerceRepository.CheckoutCourse;
import com.edualto.commerce.repository.CommerceRepository.PaymentOrder;
import com.edualto.commerce.repository.PromotionRepository;
import com.edualto.commerce.repository.PromotionRepository.PromotionRecord;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class CommerceService {

    private final CommerceRepository repository;
    private final UserService users;
    private final VnPayProperties properties;
    private final PromotionRepository promotions;
    private final PaymentGatewayRegistry gatewayRegistry;

    @Autowired
    public CommerceService(
            CommerceRepository repository,
            UserService users,
            VnPayProperties properties,
            PromotionRepository promotions,
            PaymentGatewayRegistry gatewayRegistry
    ) {
        this.repository = repository;
        this.users = users;
        this.properties = properties;
        this.promotions = promotions;
        this.gatewayRegistry = gatewayRegistry;
    }

    public CommerceService(
            CommerceRepository repository,
            UserService users,
            VnPayProperties properties,
            PromotionRepository promotions
    ) {
        this(repository, users, properties, promotions, createDefaultRegistry(properties));
    }

    private static PaymentGatewayRegistry createDefaultRegistry(VnPayProperties vnPayProperties) {
        RestClient client = RestClient.builder().build();
        ObjectMapper mapper = new ObjectMapper();
        return new PaymentGatewayRegistry(List.of(
                new VnPayPaymentGateway(vnPayProperties),
                new MoMoPaymentGateway(new MoMoProperties(null, null, null, null, null, null), client, mapper),
                new SepayPaymentGateway(SepayProperties.of(null, null, null, null, null), mapper),
                new StripePaymentGateway(new StripeProperties(null, null, null, null), client, mapper),
                new VietQrPaymentGateway()
        ));
    }

    @Transactional
    public OrderCreatedResponse createOrder(UUID studentId, CreateOrderRequest request, String clientIp) {
        users.requireActiveLearner(studentId);

        PaymentGateway gateway = gatewayRegistry.getGateway(request.paymentMethod());
        if (request.paymentMethod() == PaymentMethod.VNPAY && !gateway.isConfigured()) {
            throw new BusinessException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_GATEWAY_NOT_CONFIGURED",
                    "Thanh toán trực tuyến chưa được cấu hình");
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
            if (request.paymentMethod() != PaymentMethod.VNPAY && request.paymentMethod() != PaymentMethod.STRIPE) {
                total.setScale(0, RoundingMode.UNNECESSARY).longValueExact();
            }
        } catch (ArithmeticException exception) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COURSE_PRICE", "Giá khóa học không hợp lệ cho thanh toán VND");
        }

        UUID orderId = UUID.randomUUID();
        String transferReference = manualTransferReference(orderId);

        List<PaymentInitCommand.ItemInfo> itemInfos = courses.stream()
                .map(course -> new PaymentInitCommand.ItemInfo(course.id(), course.title(), course.price()))
                .toList();

        boolean isManualReview = request.paymentMethod() == PaymentMethod.VIETQR;
        OffsetDateTime expiresAt = promotion == null ? null : OffsetDateTime.now().plusMinutes(isManualReview ? 24 * 60 : 15);

        PaymentInitCommand initCommand = new PaymentInitCommand(
                orderId,
                studentId,
                total,
                amountMinorUnits,
                clientIp,
                transferReference,
                expiresAt,
                itemInfos
        );

        PaymentInitResult initResult = gateway.initializePayment(initCommand);
        String orderStatus = initResult.orderStatus();

        repository.insertOrder(
                orderId,
                studentId,
                request.phoneNumber(),
                subtotal,
                discountTotal,
                total,
                orderStatus,
                transferReference,
                expiresAt
        );

        for (CheckoutCourse course : courses) {
            BigDecimal discount = course.equals(promotionCourse) ? itemDiscount : BigDecimal.ZERO;
            UUID itemId = repository.insertOrderItem(
                    orderId,
                    course,
                    course.price().subtract(discount),
                    discount,
                    discount.signum() > 0 ? promotion.id() : null,
                    discount.signum() > 0 ? promotion.code() : null
            );
            if (discount.signum() > 0) {
                promotions.insertReservation(promotion.id(), orderId, itemId, studentId, discount, expiresAt);
            }
        }

        if (initResult.providerTxnRef() != null) {
            repository.insertPayment(
                    UUID.randomUUID(),
                    orderId,
                    request.paymentMethod().name(),
                    initResult.providerTxnRef(),
                    amountMinorUnits
            );
        } else {
            repository.insertPayment(
                    UUID.randomUUID(),
                    orderId,
                    request.paymentMethod().name(),
                    amountMinorUnits
            );
        }

        return new OrderCreatedResponse(
                orderId,
                orderStatus,
                "VND",
                subtotal,
                discountTotal,
                total,
                request.paymentMethod().name(),
                initResult.paymentUrl(),
                expiresAt,
                initResult.instructions()
        );
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID studentId, UUID orderId) {
        users.requireActiveLearner(studentId);
        return repository.findOrder(orderId, studentId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Không tìm thấy đơn hàng"));
    }

    @Transactional(readOnly = true)
    public Page<AdminOrderResponse> listAdminOrders(UUID adminId, int page, int size, String status) {
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
        if ("VNPAY".equals(payment.provider()) || "STRIPE".equals(payment.provider())) {
            throw new BusinessException(HttpStatus.CONFLICT, "GATEWAY_PAYMENT_CANNOT_BE_MANUAL", "Không thể xác nhận thủ công giao dịch cổng thanh toán");
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
        PaymentWebhookCommand command = new PaymentWebhookCommand(null, Map.of(), parameters);
        PaymentWebhookResult result = processWebhookInternal("VNPAY", command);
        Map<String, Object> payload = result.responsePayload();
        String rspCode = payload.getOrDefault("RspCode", result.responseCode()).toString();
        String message = payload.getOrDefault("Message", result.message()).toString();
        return new IpNResult(rspCode, message);
    }

    @Transactional
    public Map<String, Object> processGatewayWebhook(
            String provider,
            String rawPayload,
            Map<String, String> headers,
            Map<String, String> parameters
    ) {
        PaymentWebhookCommand command = new PaymentWebhookCommand(rawPayload, headers, parameters);
        PaymentWebhookResult result = processWebhookInternal(provider, command);
        return result.responsePayload();
    }

    private PaymentWebhookResult processWebhookInternal(String provider, PaymentWebhookCommand command) {
        PaymentGateway gateway = gatewayRegistry.requireGateway(provider);
        PaymentWebhookResult result = gateway.processWebhook(command);

        if (!result.signatureValid()) {
            return result;
        }

        String orderKey = result.orderLookupKey();
        if (orderKey == null || orderKey.isBlank()) {
            return result;
        }

        PaymentOrder payment = repository.lockPaymentOrder(orderKey).orElse(null);
        if (payment == null) {
            return PaymentWebhookResult.failed(orderKey, "Order not found", result.responsePayload());
        }

        if (result.amountMinorUnits() > 0 && result.amountMinorUnits() != payment.amountMinorUnits()) {
            return PaymentWebhookResult.failed(orderKey, "Invalid amount", result.responsePayload());
        }

        if ("PAID".equals(payment.paymentStatus()) && "PAID".equals(payment.orderStatus())) {
            return result;
        }

        if (!"PENDING".equals(payment.paymentStatus()) && !"REVIEW".equals(payment.paymentStatus())) {
            return result;
        }

        if (result.successful()) {
            if (repository.orderHasPromotion(payment.orderId()) && !promotions.reservationIsActive(payment.orderId())) {
                repository.markPaymentReview(payment.orderId(), "PROMOTION_RESERVATION_EXPIRED");
                promotions.releaseReservation(payment.orderId());
                return result;
            }
            if (repository.orderHasPromotion(payment.orderId()) && !promotions.redeemReservation(payment.orderId())) {
                repository.markPaymentReview(payment.orderId(), "PROMOTION_RESERVATION_EXPIRED");
                promotions.releaseReservation(payment.orderId());
                return result;
            }
            repository.markPaymentPaid(payment.orderId(), payment.studentId());
        } else {
            repository.markPaymentFailed(payment.orderId());
            promotions.releaseReservation(payment.orderId());
        }
        return result;
    }

    private static String manualTransferReference(UUID orderId) {
        return "EA" + orderId.toString().replace("-", "").substring(0, 22).toUpperCase(Locale.ROOT);
    }

    public record IpNResult(String rspCode, String message) {
    }
}
