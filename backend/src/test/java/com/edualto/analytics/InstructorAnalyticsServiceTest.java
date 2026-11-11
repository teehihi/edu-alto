package com.edualto.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edualto.analytics.dto.InstructorAnalyticsOverviewResponse;
import com.edualto.analytics.dto.InstructorCoursePerformanceDto;
import com.edualto.analytics.dto.InstructorMonthlyTrendDto;
import com.edualto.analytics.repository.InstructorAnalyticsRepository;
import com.edualto.analytics.service.InstructorAnalyticsService;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class InstructorAnalyticsServiceTest {

    @Mock
    private InstructorAnalyticsRepository repository;

    @Mock
    private UserService users;

    private InstructorAnalyticsService service;

    private final UUID instructorId = UUID.randomUUID();
    private final UUID courseId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new InstructorAnalyticsService(repository, users);
    }

    @Test
    void getOverview_WhenValidInstructor_ReturnsOverview() {
        List<InstructorMonthlyTrendDto> mockTrends = List.of(
                new InstructorMonthlyTrendDto("2026-10", "10/2026", 12, 5, BigDecimal.valueOf(1200000), 41.7),
                new InstructorMonthlyTrendDto("2026-11", "11/2026", 20, 8, BigDecimal.valueOf(2500000), 40.0)
        );

        List<InstructorCoursePerformanceDto> mockCourses = List.of(
                new InstructorCoursePerformanceDto(
                        courseId,
                        "Lập trình Spring Boot",
                        "PUBLISHED",
                        BigDecimal.valueOf(500000),
                        20,
                        8,
                        75.0,
                        10,
                        BigDecimal.valueOf(3700000),
                        4.9,
                        15
                )
        );

        when(repository.findMonthlyTrends(eq(instructorId), eq(null), any(), any()))
                .thenReturn(mockTrends);
        when(repository.findCoursePerformances(instructorId, null))
                .thenReturn(mockCourses);
        when(repository.countDistinctStudents(instructorId, null))
                .thenReturn(20L);
        when(repository.countCompletedLessons(instructorId, null))
                .thenReturn(150L);

        InstructorAnalyticsOverviewResponse response = service.getOverview(instructorId, null);

        verify(users).requireActiveInstructor(instructorId);
        assertThat(response).isNotNull();
        assertThat(response.summary().totalStudents()).isEqualTo(20L);
        assertThat(response.summary().newStudentsThisMonth()).isEqualTo(20L);
        assertThat(response.summary().revenueThisMonth()).isEqualTo(BigDecimal.valueOf(2500000));
        assertThat(response.summary().totalRevenue()).isEqualTo(BigDecimal.valueOf(3700000));
        assertThat(response.summary().totalCertificates()).isEqualTo(8L);
        assertThat(response.summary().averageCompletionRate()).isEqualTo(75.0);
        assertThat(response.monthlyTrends()).hasSize(2);
        assertThat(response.coursePerformances()).hasSize(1);
    }

    @Test
    void getOverview_WhenCourseNotOwned_ThrowsNotFound() {
        when(repository.ownsCourse(instructorId, courseId)).thenReturn(false);

        assertThatThrownBy(() -> service.getOverview(instructorId, courseId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);
    }
}
