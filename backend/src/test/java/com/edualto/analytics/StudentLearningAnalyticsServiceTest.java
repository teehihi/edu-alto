package com.edualto.analytics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edualto.analytics.dto.StudentCourseAnalyticsResponse;
import com.edualto.analytics.dto.StudentLearningAnalyticsOverviewResponse;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.AssignmentStatusRow;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.CourseOverviewRow;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.DailyMetricRow;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.EnrolledCourseMetaRow;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.QuizStatusRow;
import com.edualto.analytics.service.StudentLearningAnalyticsService;
import com.edualto.analytics.service.StudentLearningAnalyticsService.StreakMetrics;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class StudentLearningAnalyticsServiceTest {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private StudentLearningAnalyticsRepository repository;

    @Mock
    private UserService users;

    private StudentLearningAnalyticsService service;

    private final UUID studentId = UUID.randomUUID();
    private final Instant fixedNow = Instant.parse("2026-11-12T08:00:00Z"); // 15:00 +07:00
    private final LocalDate todayVn = fixedNow.atZone(VN_ZONE).toLocalDate();

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(fixedNow, VN_ZONE);
        service = new StudentLearningAnalyticsService(repository, users, fixedClock);
    }

    @Test
    void calculateStreaks_HandlesActiveStreakEndingYesterdayAndBrokenStreak() {
        StreakMetrics activeFromYesterday = service.calculateStreaks(
                List.of(todayVn.minusDays(1), todayVn.minusDays(2), todayVn.minusDays(3), todayVn.minusDays(10)),
                todayVn
        );
        assertThat(activeFromYesterday.currentStreakDays()).isEqualTo(3);
        assertThat(activeFromYesterday.longestStreakDays()).isEqualTo(3);

        StreakMetrics broken = service.calculateStreaks(
                List.of(todayVn.minusDays(2), todayVn.minusDays(3), todayVn.minusDays(4), todayVn.minusDays(5)),
                todayVn
        );
        assertThat(broken.currentStreakDays()).isEqualTo(0);
        assertThat(broken.longestStreakDays()).isEqualTo(4);
    }

    @Test
    void getOverview_ComputesBestQuizAttemptIgnoresUngradedNullsAndGeneratesFocusItems() {
        UUID courseId = UUID.randomUUID();
        UUID passedQuizId = UUID.randomUUID();
        UUID failedQuizId = UUID.randomUUID();
        UUID failedLessonId = UUID.randomUUID();
        UUID gradedAssignId = UUID.randomUUID();
        UUID ungradedAssignId = UUID.randomUUID();
        UUID overdueAssignId = UUID.randomUUID();

        when(repository.findDailyMetrics(studentId, todayVn.minusDays(6), todayVn)).thenReturn(List.of(
                new DailyMetricRow(todayVn.minusDays(1), 3600L, 2L),
                new DailyMetricRow(todayVn, 1800L, 1L)
        ));
        when(repository.findActiveDatesDesc(studentId)).thenReturn(List.of(
                todayVn,
                todayVn.minusDays(1)
        ));
        when(repository.findEnrolledCourses(studentId)).thenReturn(List.of(
                new CourseOverviewRow(
                        courseId,
                        "Spring Boot Thực Chiến",
                        "spring-boot-thuc-chien",
                        10L,
                        4L,
                        fixedNow.minusSeconds(8L * 86400L)
                )
        ));
        when(repository.findQuizStatuses(studentId, null)).thenReturn(List.of(
                // Retaken quiz: passed on best attempt (90/100 = 9.0/10)
                new QuizStatusRow(
                        passedQuizId,
                        UUID.randomUUID(),
                        "Quiz 1: Nền tảng",
                        "Chương 1",
                        courseId,
                        "Spring Boot Thực Chiến",
                        70.0,
                        90.0,
                        90.0,
                        true,
                        2,
                        fixedNow.minusSeconds(3600)
                ),
                // Failed quiz across 2 attempts -> should appear in focusItems
                new QuizStatusRow(
                        failedQuizId,
                        failedLessonId,
                        "Quiz 2: Bảo mật JWT",
                        "Chương 2",
                        courseId,
                        "Spring Boot Thực Chiến",
                        70.0,
                        50.0,
                        40.0,
                        false,
                        2,
                        fixedNow.minusSeconds(1800)
                )
        ));
        when(repository.findAssignmentStatuses(studentId, null)).thenReturn(List.of(
                new AssignmentStatusRow(
                        gradedAssignId,
                        "Bài tập 1: Thiết kế API",
                        courseId,
                        "Spring Boot Thực Chiến",
                        fixedNow.plusSeconds(86400),
                        20.0,
                        true,
                        fixedNow.minusSeconds(7200),
                        16.0,
                        fixedNow.minusSeconds(3600)
                ),
                // Submitted but not graded yet -> MUST NOT be averaged as 0.0
                new AssignmentStatusRow(
                        ungradedAssignId,
                        "Bài tập 2: Viết test",
                        courseId,
                        "Spring Boot Thực Chiến",
                        fixedNow.plusSeconds(5 * 86400L),
                        10.0,
                        true,
                        fixedNow.minusSeconds(1000),
                        null,
                        null
                ),
                // Overdue & unsubmitted -> HIGH focus item
                new AssignmentStatusRow(
                        overdueAssignId,
                        "Bài tập 3: Dockerize",
                        courseId,
                        "Spring Boot Thực Chiến",
                        fixedNow.minusSeconds(2 * 86400L),
                        10.0,
                        false,
                        null,
                        null,
                        null
                )
        ));

        StudentLearningAnalyticsOverviewResponse response = service.getOverview(studentId, 7);

        verify(users).requireActiveStudent(studentId);
        assertThat(response.windowDays()).isEqualTo(7);
        assertThat(response.currentWeekActivity()).hasSize(7);
        assertThat(response.windowDailyActivity()).hasSize(7);

        assertThat(response.summary().activeCourseCount()).isEqualTo(1);
        assertThat(response.summary().completionRate()).isEqualTo(40.0);
        // Quiz best scores: (9.0 + 5.0) / 2 = 7.0
        assertThat(response.summary().averageQuizScoreOutOf10()).isEqualTo(7.0);
        assertThat(response.summary().quizPassRate()).isEqualTo(50.0);
        // Only gradedAssign (16/20 -> 8.0) counts, ungradedAssign is ignored
        assertThat(response.summary().averageAssignmentScoreOutOf10()).isEqualTo(8.0);
        // Overall combined mean: (9.0 + 5.0 + 8.0) / 3 = 7.33
        assertThat(response.summary().overallAverageScoreOutOf10()).isEqualTo(7.33);
        assertThat(response.summary().currentStreakDays()).isEqualTo(2);
        assertThat(response.summary().estimatedStudyHoursInWindow()).isEqualTo(1.5);
        assertThat(response.summary().activeDaysInWindow()).isEqualTo(2);

        assertThat(response.focusItems())
                .extracting(item -> item.type())
                .containsExactly("FAILED_QUIZ", "OVERDUE_ASSIGNMENT", "INACTIVE_COURSE");
        assertThat(response.focusItems().get(0).actionHref())
                .isEqualTo("/learning/lessons/" + failedLessonId);

        assertThat(response.prediction()).isNotNull();
        assertThat(response.prediction().completionPercentage()).isGreaterThan(0);
        assertThat(response.prediction().statusBadge()).isNotEmpty();
        assertThat(response.prediction().priorityActionTitle()).isEqualTo(response.focusItems().get(0).title());
        assertThat(response.prediction().priorityActionHref()).isEqualTo(response.focusItems().get(0).actionHref());
    }

    @Test
    void getOverview_RejectsUnsupportedWindowDays() {
        assertThatThrownBy(() -> service.getOverview(studentId, 14))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST)
                .hasFieldOrPropertyWithValue("code", "INVALID_ANALYTICS_WINDOW");
    }

    @Test
    void getCourseAnalytics_ThrowsForbiddenWhenNotEnrolledAndNotFoundWhenMissing() {
        UUID missingCourseId = UUID.randomUUID();
        UUID unenrolledCourseId = UUID.randomUUID();

        when(repository.checkCourseAccess(studentId, missingCourseId))
                .thenReturn(new EnrolledCourseMetaRow(false, false, missingCourseId, null, null));
        when(repository.checkCourseAccess(studentId, unenrolledCourseId))
                .thenReturn(new EnrolledCourseMetaRow(true, false, unenrolledCourseId, "Khóa học khác", "other"));

        assertThatThrownBy(() -> service.getCourseAnalytics(studentId, missingCourseId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.NOT_FOUND);

        assertThatThrownBy(() -> service.getCourseAnalytics(studentId, unenrolledCourseId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.FORBIDDEN)
                .hasFieldOrPropertyWithValue("code", "ENROLLMENT_REQUIRED");
    }

    @Test
    void getCourseAnalytics_ReturnsDetailedCourseQuizzesAndAssignments() {
        UUID courseId = UUID.randomUUID();
        when(repository.checkCourseAccess(studentId, courseId))
                .thenReturn(new EnrolledCourseMetaRow(true, true, courseId, "PostgreSQL Mastery", "pg-mastery"));
        when(repository.findEnrolledCourses(studentId)).thenReturn(List.of(
                new CourseOverviewRow(courseId, "PostgreSQL Mastery", "pg-mastery", 5L, 5L, fixedNow)
        ));
        when(repository.findQuizStatuses(studentId, courseId)).thenReturn(List.of());
        when(repository.findAssignmentStatuses(studentId, courseId)).thenReturn(List.of());

        StudentCourseAnalyticsResponse response = service.getCourseAnalytics(studentId, courseId);

        assertThat(response.course().courseId()).isEqualTo(courseId);
        assertThat(response.course().completionPercent()).isEqualTo(100);
        assertThat(response.course().bestQuizAverageOutOf10()).isNull();
        assertThat(response.course().assignmentAverageOutOf10()).isNull();
        assertThat(response.focusItems()).isEmpty();
    }
}
