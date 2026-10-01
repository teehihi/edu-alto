package com.edualto.commerce.service;

import com.edualto.commerce.dto.PromotionRequest;
import com.edualto.commerce.dto.PromotionResponse;
import com.edualto.commerce.dto.PromotionSummaryResponse;
import com.edualto.commerce.repository.PromotionRepository;
import com.edualto.commerce.repository.PromotionRepository.PromotionRecord;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.YearMonth;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InstructorPromotionService {
    private static final Set<String> DISCOUNT_TYPES = Set.of("PERCENT", "FIXED");
    private final PromotionRepository promotions;
    private final UserService users;

    public InstructorPromotionService(PromotionRepository promotions, UserService users) {
        this.promotions = promotions;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Page<PromotionResponse> list(UUID instructorId, UUID courseId, int page, int size, String search, String status) {
        users.requireActiveInstructor(instructorId);
        requireOwnedCourse(instructorId, courseId);
        validatePagination(page, size);
        validateStatusFilter(status);
        String query = normalizeSearch(search);
        long total = promotions.count(courseId, query, status);
        return new PageImpl<>(promotions.list(courseId, query, status, size, (long) page * size), PageRequest.of(page, size), total);
    }

    @Transactional
    public PromotionResponse create(UUID instructorId, UUID courseId, PromotionRequest request) {
        users.requireActiveInstructor(instructorId);
        requireOwnedCourse(instructorId, courseId);
        validate(request);
        String code = normalizeCode(request.code());
        if (promotions.codeExists(code, null)) {
            throw conflict("PROMOTION_CODE_EXISTS", "Mã khuyến mãi đã được sử dụng");
        }
        UUID id;
        try {
            id = promotions.insert(courseId, request, code);
        } catch (DataIntegrityViolationException exception) {
            throw conflict("PROMOTION_CODE_EXISTS", "Mã khuyến mãi đã được sử dụng");
        }
        return promotions.findResponse(id).orElseThrow();
    }

    @Transactional
    public PromotionResponse update(UUID instructorId, UUID promotionId, PromotionRequest request) {
        users.requireActiveInstructor(instructorId);
        validate(request);
        PromotionRecord current = promotions.lock(promotionId)
                .filter(promotion -> promotions.ownsCourse(instructorId, promotion.courseId()))
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "PROMOTION_NOT_FOUND", "Không tìm thấy mã khuyến mãi"));
        String code = normalizeCode(request.code());
        if (promotions.codeExists(code, promotionId)) {
            throw conflict("PROMOTION_CODE_EXISTS", "Mã khuyến mãi đã được sử dụng");
        }
        boolean changedTerms = !current.code().equals(code)
                || !current.discountType().equals(request.discountType())
                || current.discountValue().compareTo(request.discountValue()) != 0;
        if (changedTerms && promotions.hasReservationOrRedemption(promotionId)) {
            throw conflict("PROMOTION_TERMS_LOCKED", "Không thể đổi mã hoặc mức giảm sau khi đã có lượt sử dụng");
        }
        if (request.maxRedemptions() != null
                && request.maxRedemptions() < promotions.countCapacityUsage(promotionId)) {
            throw conflict("PROMOTION_LIMIT_BELOW_USAGE", "Giới hạn lượt dùng không thể thấp hơn số lượt đã đổi hoặc đang giữ chỗ");
        }
        String requestedStatus = request.status() == null ? (current.enabled() ? "ACTIVE" : "DISABLED") : request.status();
        if (!Set.of("ACTIVE", "DISABLED").contains(requestedStatus)) {
            throw badRequest("INVALID_PROMOTION_STATUS", "Trạng thái chỉ được bật hoặc tắt mã khuyến mãi");
        }
        try {
            promotions.update(promotionId, request, code, "ACTIVE".equals(requestedStatus));
        } catch (DataIntegrityViolationException exception) {
            throw conflict("PROMOTION_CODE_EXISTS", "Mã khuyến mãi đã được sử dụng");
        }
        return promotions.findResponse(promotionId).orElseThrow();
    }

    @Transactional(readOnly = true)
    public PromotionSummaryResponse summary(UUID instructorId, UUID courseId) {
        users.requireActiveInstructor(instructorId);
        requireOwnedCourse(instructorId, courseId);
        PromotionSummaryResponse totals = promotions.summary(courseId);
        YearMonth current = YearMonth.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime firstMonth = current.minusMonths(11).atDay(1).atStartOfDay();
        LocalDateTime nextMonth = current.plusMonths(1).atDay(1).atStartOfDay();
        return new PromotionSummaryResponse(totals.totalPromotionCount(), totals.redeemedCount(), totals.redeemedAmount(),
                promotions.findRedemptionPeriods(courseId, firstMonth, nextMonth));
    }

    private void validate(PromotionRequest request) {
        if (request == null || request.name() == null || request.name().isBlank() || request.name().trim().length() > 120
                || request.code() == null || request.code().isBlank() || !request.code().trim().matches("[A-Za-z0-9_-]{3,40}")
                || request.discountType() == null || !DISCOUNT_TYPES.contains(request.discountType())
                || request.discountValue() == null || request.discountValue().signum() <= 0
                || (request.maxRedemptions() != null && request.maxRedemptions() < 1)
                || request.startsAt() == null || request.endsAt() == null || !request.endsAt().isAfter(request.startsAt())) {
            throw badRequest("INVALID_PROMOTION", "Thông tin mã khuyến mãi không hợp lệ");
        }
        try {
            request.discountValue().setScale(0, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw badRequest("INVALID_PROMOTION_AMOUNT", "Mức giảm phải là số tiền nguyên VND");
        }
        if ("PERCENT".equals(request.discountType()) && request.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw badRequest("INVALID_PROMOTION_PERCENT", "Phần trăm giảm tối đa là 100%");
        }
    }

    private void requireOwnedCourse(UUID instructorId, UUID courseId) {
        if (!promotions.ownsCourse(instructorId, courseId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
        }
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw badRequest("INVALID_PAGINATION", "Phân trang mã khuyến mãi không hợp lệ");
        }
    }

    private void validateStatusFilter(String status) {
        if (status != null && !Set.of("SCHEDULED", "ACTIVE", "DISABLED", "EXPIRED", "EXHAUSTED").contains(status)) {
            throw badRequest("INVALID_PROMOTION_STATUS", "Trạng thái mã khuyến mãi không hợp lệ");
        }
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) return null;
        if (search.trim().length() > 100) throw badRequest("SEARCH_TOO_LONG", "Từ khóa tìm kiếm tối đa 100 ký tự");
        return search.trim();
    }

    private String normalizeCode(String code) { return code.trim().toUpperCase(Locale.ROOT); }
    private BusinessException conflict(String code, String message) { return new BusinessException(HttpStatus.CONFLICT, code, message); }
    private BusinessException badRequest(String code, String message) { return new BusinessException(HttpStatus.BAD_REQUEST, code, message); }
}
