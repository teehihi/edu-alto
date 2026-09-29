package com.edualto.schedule.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.repository.CourseRepository;
import com.edualto.enrollment.domain.EnrollmentStatus;
import com.edualto.enrollment.repository.EnrollmentRepository;
import com.edualto.schedule.domain.CalendarEvent;
import com.edualto.schedule.domain.CalendarEventStatus;
import com.edualto.schedule.dto.CalendarEventRequest;
import com.edualto.schedule.dto.CalendarEventResponse;
import com.edualto.schedule.repository.CalendarEventRepository;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.service.UserService;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CalendarEventService {
    private static final Duration MAX_RANGE = Duration.ofDays(366);

    private final CalendarEventRepository events;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final UserService users;

    public CalendarEventService(CalendarEventRepository events, CourseRepository courses,
                                EnrollmentRepository enrollments, UserService users) {
        this.events = events;
        this.courses = courses;
        this.enrollments = enrollments;
        this.users = users;
    }

    @Transactional
    public CalendarEventResponse create(UUID userId, CalendarEventRequest request) {
        requireActiveUser(userId);
        validatePeriod(request.startsAt(), request.endsAt());
        validateCourseAccess(userId, request.courseId());
        CalendarEvent event = events.save(new CalendarEvent(userId, request.courseId(), request.title().trim(),
                normalizeDescription(request.description()), request.startsAt(), request.endsAt(), request.status()));
        return CalendarEventResponse.from(event);
    }

    @Transactional(readOnly = true)
    public List<CalendarEventResponse> list(UUID userId, OffsetDateTime from, OffsetDateTime to) {
        requireActiveUser(userId);
        if (from == null || to == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "CALENDAR_RANGE_REQUIRED", "Vui lòng chọn thời gian bắt đầu và kết thúc để xem lịch");
        }
        if (!to.isAfter(from) || Duration.between(from, to).compareTo(MAX_RANGE) > 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_CALENDAR_RANGE", "Khoảng thời gian xem lịch phải lớn hơn 0 và không quá 366 ngày");
        }
        return events.findAllByUserIdAndStartsAtLessThanAndEndsAtGreaterThanOrderByStartsAtAsc(userId, to, from)
                .stream().map(CalendarEventResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CalendarEventResponse get(UUID userId, UUID eventId) {
        requireActiveUser(userId);
        return CalendarEventResponse.from(requireOwnedEvent(userId, eventId));
    }

    @Transactional
    public CalendarEventResponse update(UUID userId, UUID eventId, CalendarEventRequest request) {
        requireActiveUser(userId);
        CalendarEvent event = requireOwnedEvent(userId, eventId);
        validatePeriod(request.startsAt(), request.endsAt());
        validateCourseAccess(userId, request.courseId());
        event.update(request.courseId(), request.title().trim(), normalizeDescription(request.description()),
                request.startsAt(), request.endsAt(), request.status());
        return CalendarEventResponse.from(event);
    }

    @Transactional
    public void delete(UUID userId, UUID eventId) {
        requireActiveUser(userId);
        events.delete(requireOwnedEvent(userId, eventId));
    }

    private User requireActiveUser(UUID userId) {
        User user = users.requireById(userId);
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ACTIVE_ACCOUNT_REQUIRED", "Tài khoản cần được kích hoạt để sử dụng lịch cá nhân");
        }
        return user;
    }

    private void validateCourseAccess(UUID userId, UUID courseId) {
        if (courseId == null) {
            return;
        }
        User user = requireActiveUser(userId);
        Course course = courses.findById(courseId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        boolean instructor = user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.INSTRUCTOR);
        boolean student = user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.STUDENT);
        if (instructor && course.getInstructorId().equals(userId)) {
            return;
        }
        if (student && enrollments.findByStudentIdAndCourseId(userId, courseId)
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE).isPresent()) {
            return;
        }
        throw new BusinessException(HttpStatus.FORBIDDEN, "COURSE_ACCESS_REQUIRED", "Bạn cần là giảng viên sở hữu khóa học hoặc học viên đã ghi danh để gắn sự kiện");
    }

    private CalendarEvent requireOwnedEvent(UUID userId, UUID eventId) {
        return events.findByIdAndUserId(eventId, userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "CALENDAR_EVENT_NOT_FOUND", "Không tìm thấy sự kiện lịch"));
    }

    private void validatePeriod(OffsetDateTime startsAt, OffsetDateTime endsAt) {
        if (startsAt == null || endsAt == null || !endsAt.isAfter(startsAt)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_EVENT_PERIOD", "Thời gian kết thúc phải sau thời gian bắt đầu");
        }
    }

    private String normalizeDescription(String description) {
        return description == null || description.isBlank() ? null : description.trim();
    }
}
