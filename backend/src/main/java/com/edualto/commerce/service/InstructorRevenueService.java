package com.edualto.commerce.service;

import com.edualto.commerce.dto.InstructorRevenueSummaryResponse;
import com.edualto.commerce.dto.InstructorCourseRevenueResponse;
import com.edualto.commerce.dto.InstructorRevenueTransactionResponse;
import com.edualto.commerce.repository.CommerceRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.service.UserService;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InstructorRevenueService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> ORDER_STATUSES = Set.of(
            "PENDING_PAYMENT", "PAYMENT_REVIEW", "PAID", "PAYMENT_FAILED"
    );

    private final CommerceRepository commerce;
    private final UserService users;

    public InstructorRevenueService(CommerceRepository commerce, UserService users) {
        this.commerce = commerce;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public InstructorRevenueSummaryResponse getSummary(UUID instructorId, LocalDate from, LocalDate to) {
        requireActiveInstructor(instructorId);
        DateWindow window = toWindow(from, to);
        YearMonth currentMonth = YearMonth.now(BUSINESS_ZONE);
        OffsetDateTime firstMonth = currentMonth.minusMonths(11).atDay(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime nextMonth = currentMonth.plusMonths(1).atDay(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        return new InstructorRevenueSummaryResponse(
                commerce.sumInstructorPaidNet(instructorId, window.from(), window.to()),
                commerce.countInstructorPaidTransactions(instructorId, window.from(), window.to()),
                commerce.countInstructorPendingTransactions(instructorId, window.from(), window.to()),
                commerce.findInstructorPaidNetByMonth(instructorId, firstMonth.toLocalDateTime(), nextMonth.toLocalDateTime())
        );
    }

    @Transactional(readOnly = true)
    public InstructorCourseRevenueResponse getCourseSummary(UUID instructorId, UUID courseId) {
        requireActiveInstructor(instructorId);
        if (!commerce.ownsCourse(instructorId, courseId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
        }
        YearMonth currentMonth = YearMonth.now(BUSINESS_ZONE);
        OffsetDateTime firstMonth = currentMonth.minusMonths(11).atDay(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime nextMonth = currentMonth.plusMonths(1).atDay(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        return commerce.findCourseRevenueSummary(
                instructorId, courseId, firstMonth.toLocalDateTime(), nextMonth.toLocalDateTime());
    }

    @Transactional(readOnly = true)
    public Page<InstructorRevenueTransactionResponse> listTransactions(
            UUID instructorId,
            int page,
            int size,
            String search,
            String status,
            LocalDate from,
            LocalDate to
    ) {
        requireActiveInstructor(instructorId);
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang giao dịch không hợp lệ");
        }
        if (status != null && !ORDER_STATUSES.contains(status)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ORDER_STATUS", "Trạng thái giao dịch không hợp lệ");
        }
        String normalizedSearch = search == null || search.isBlank() ? null : search.trim();
        if (normalizedSearch != null && normalizedSearch.length() > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SEARCH_TOO_LONG", "Từ khóa tìm kiếm tối đa 100 ký tự");
        }
        DateWindow window = toWindow(from, to);
        long total = commerce.countInstructorTransactions(instructorId, window.from(), window.to(), normalizedSearch, status);
        var content = commerce.findInstructorTransactions(
                instructorId, window.from(), window.to(), normalizedSearch, status, size, (long) page * size
        );
        return new PageImpl<>(content, PageRequest.of(page, size), total);
    }

    private void requireActiveInstructor(UUID instructorId) {
        User user = users.requireById(instructorId);
        if (user.getStatus() != UserStatus.ACTIVE
                || user.getRoles().stream().noneMatch(role -> role.getName() == RoleName.INSTRUCTOR)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "INSTRUCTOR_REQUIRED", "Chức năng này dành cho giảng viên đang hoạt động");
        }
    }

    private DateWindow toWindow(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_DATE_RANGE", "Ngày bắt đầu không được sau ngày kết thúc");
        }
        OffsetDateTime start = from == null ? null : from.atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        OffsetDateTime endExclusive = to == null ? null : to.plusDays(1).atStartOfDay(BUSINESS_ZONE).toOffsetDateTime();
        return new DateWindow(start, endExclusive);
    }

    private record DateWindow(OffsetDateTime from, OffsetDateTime to) {
    }
}
