package com.edualto.analytics.service;

import com.edualto.analytics.dto.InstructorAnalyticsOverviewResponse;
import com.edualto.analytics.dto.InstructorAnalyticsSummaryDto;
import com.edualto.analytics.dto.InstructorCoursePerformanceDto;
import com.edualto.analytics.dto.InstructorMonthlyTrendDto;
import com.edualto.analytics.repository.InstructorAnalyticsRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InstructorAnalyticsService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final InstructorAnalyticsRepository repository;
    private final UserService users;

    public InstructorAnalyticsService(InstructorAnalyticsRepository repository, UserService users) {
        this.repository = repository;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public InstructorAnalyticsOverviewResponse getOverview(UUID instructorId, UUID courseId) {
        users.requireActiveInstructor(instructorId);

        if (courseId != null && !repository.ownsCourse(instructorId, courseId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
        }

        YearMonth currentMonth = YearMonth.now(BUSINESS_ZONE);
        LocalDateTime firstMonth = currentMonth.minusMonths(11).atDay(1).atStartOfDay();
        LocalDateTime nextMonth = currentMonth.plusMonths(1).atDay(1).atStartOfDay();

        List<InstructorMonthlyTrendDto> monthlyTrends = repository.findMonthlyTrends(
                instructorId,
                courseId,
                firstMonth,
                nextMonth
        );

        List<InstructorCoursePerformanceDto> coursePerformances = repository.findCoursePerformances(
                instructorId,
                courseId
        );

        long totalStudents = repository.countDistinctStudents(instructorId, courseId);

        long newStudentsThisMonth = 0;
        BigDecimal revenueThisMonth = BigDecimal.ZERO;
        if (!monthlyTrends.isEmpty()) {
            InstructorMonthlyTrendDto latestMonth = monthlyTrends.get(monthlyTrends.size() - 1);
            newStudentsThisMonth = latestMonth.newEnrollments();
            revenueThisMonth = latestMonth.revenue();
        }

        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalCertificates = 0;
        long totalCompletedLessons = 0;
        long totalExpectedLessons = 0;

        for (InstructorCoursePerformanceDto course : coursePerformances) {
            totalRevenue = totalRevenue.add(course.revenue());
            totalCertificates += course.completedStudentsCount();
            if (course.studentCount() > 0 && course.totalLessons() > 0) {
                totalExpectedLessons += course.totalLessons() * course.studentCount();
                totalCompletedLessons += Math.round((course.completionRate() / 100.0) * course.totalLessons() * course.studentCount());
            }
        }

        double averageCompletionRate = totalExpectedLessons > 0
                ? Math.min(100.0, Math.round(((double) totalCompletedLessons / totalExpectedLessons * 100.0) * 10.0) / 10.0)
                : 0.0;

        InstructorAnalyticsSummaryDto summary = new InstructorAnalyticsSummaryDto(
                totalStudents,
                newStudentsThisMonth,
                totalRevenue,
                revenueThisMonth,
                averageCompletionRate,
                totalCertificates,
                totalCompletedLessons
        );

        return new InstructorAnalyticsOverviewResponse(
                summary,
                monthlyTrends,
                coursePerformances
        );
    }
}
