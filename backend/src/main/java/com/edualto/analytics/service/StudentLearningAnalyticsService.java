package com.edualto.analytics.service;

import com.edualto.analytics.dto.StudentAnalyticsSummaryDto;
import com.edualto.analytics.dto.StudentCourseAnalyticsResponse;
import com.edualto.analytics.dto.StudentCourseAssignmentItemDto;
import com.edualto.analytics.dto.StudentCoursePerformanceSummaryDto;
import com.edualto.analytics.dto.StudentCourseQuizItemDto;
import com.edualto.analytics.dto.StudentDailyActivityDto;
import com.edualto.analytics.dto.StudentFocusItemDto;
import com.edualto.analytics.dto.StudentLearningAnalyticsOverviewResponse;
import com.edualto.analytics.dto.StudentScoreTrendPointDto;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.AssignmentStatusRow;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.CourseOverviewRow;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.DailyMetricRow;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.EnrolledCourseMetaRow;
import com.edualto.analytics.repository.StudentLearningAnalyticsRepository.QuizStatusRow;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentLearningAnalyticsService {

    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final DateTimeFormatter DATE_KEY_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter SHORT_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM");
    private static final int MAX_SCORE_TREND_POINTS = 20;
    private static final int MAX_FOCUS_ITEMS = 10;
    private static final int INACTIVE_COURSE_THRESHOLD_DAYS = 7;
    private static final int DUE_SOON_WINDOW_DAYS = 3;

    private final StudentLearningAnalyticsRepository repository;
    private final UserService users;
    private final Clock clock;

    @Autowired
    public StudentLearningAnalyticsService(
            StudentLearningAnalyticsRepository repository,
            UserService users
    ) {
        this(repository, users, Clock.system(BUSINESS_ZONE));
    }

    public StudentLearningAnalyticsService(
            StudentLearningAnalyticsRepository repository,
            UserService users,
            Clock clock
    ) {
        this.repository = repository;
        this.users = users;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public StudentLearningAnalyticsOverviewResponse getOverview(UUID studentId, int days) {
        Objects.requireNonNull(studentId, "studentId must not be null");
        if (days != 7 && days != 30) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_ANALYTICS_WINDOW",
                    "Khoảng thời gian thống kê chỉ hỗ trợ 7 hoặc 30 ngày"
            );
        }
        users.requireActiveStudent(studentId);

        Instant now = Instant.now(clock);
        LocalDate todayVn = now.atZone(BUSINESS_ZONE).toLocalDate();
        LocalDate currentWeekStartVn = todayVn.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate windowStartVn = todayVn.minusDays(days - 1L);
        LocalDate queryFromDate = currentWeekStartVn.isBefore(windowStartVn) ? currentWeekStartVn : windowStartVn;

        List<DailyMetricRow> dailyRows = repository.findDailyMetrics(studentId, queryFromDate, todayVn);
        Map<LocalDate, DailyMetricRow> dailyByDate = new HashMap<>();
        for (DailyMetricRow row : dailyRows) {
            dailyByDate.put(row.activityDate(), row);
        }

        List<StudentDailyActivityDto> currentWeekActivity = buildCurrentWeekSeries(currentWeekStartVn, todayVn, dailyByDate);
        List<StudentDailyActivityDto> windowDailyActivity = buildWindowSeries(windowStartVn, todayVn, dailyByDate);

        List<LocalDate> activeDatesDesc = repository.findActiveDatesDesc(studentId);
        StreakMetrics streaks = calculateStreaks(activeDatesDesc, todayVn);

        int activeDaysInWindow = 0;
        long totalWindowSeconds = 0;
        long completedLessonsInWindow = 0;
        for (int i = 0; i < days; i++) {
            LocalDate date = windowStartVn.plusDays(i);
            DailyMetricRow metric = dailyByDate.get(date);
            boolean hasActivity = activeDatesDesc.contains(date);
            if (hasActivity || (metric != null && (metric.studySeconds() > 0 || metric.completedLessons() > 0))) {
                activeDaysInWindow++;
            }
            if (metric != null) {
                totalWindowSeconds += metric.studySeconds();
                completedLessonsInWindow += metric.completedLessons();
            }
        }

        int currentWeekActiveDays = 0;
        long currentWeekSeconds = 0;
        for (int i = 0; i < 7; i++) {
            LocalDate date = currentWeekStartVn.plusDays(i);
            if (date.isAfter(todayVn)) {
                continue;
            }
            DailyMetricRow metric = dailyByDate.get(date);
            boolean hasActivity = activeDatesDesc.contains(date);
            if (hasActivity || (metric != null && (metric.studySeconds() > 0 || metric.completedLessons() > 0))) {
                currentWeekActiveDays++;
            }
            if (metric != null) {
                currentWeekSeconds += metric.studySeconds();
            }
        }

        List<CourseOverviewRow> courses = repository.findEnrolledCourses(studentId);
        List<QuizStatusRow> quizzes = repository.findQuizStatuses(studentId, null);
        List<AssignmentStatusRow> assignments = repository.findAssignmentStatuses(studentId, null);

        List<StudentCoursePerformanceSummaryDto> coursePerformances = buildCoursePerformances(courses, quizzes, assignments);
        List<StudentScoreTrendPointDto> scoreTrend = buildScoreTrend(quizzes, assignments);
        List<StudentFocusItemDto> focusItems = buildFocusItems(courses, quizzes, assignments, now, todayVn);

        long totalLessons = courses.stream().mapToLong(CourseOverviewRow::totalLessons).sum();
        long completedLessons = courses.stream()
                .mapToLong(row -> Math.min(row.completedLessons(), row.totalLessons()))
                .sum();
        double completionRate = totalLessons > 0
                ? roundOneDecimal(Math.min(100.0, ((double) completedLessons / totalLessons) * 100.0))
                : 0.0;

        List<Double> quizBestScoresOutOf10 = new ArrayList<>();
        long attemptedQuizzesCount = 0;
        long passedQuizzesCount = 0;
        for (QuizStatusRow quiz : quizzes) {
            if (quiz.attemptCount() > 0 && quiz.bestScore() != null) {
                attemptedQuizzesCount++;
                if (Boolean.TRUE.equals(quiz.bestPassed())) {
                    passedQuizzesCount++;
                }
                quizBestScoresOutOf10.add(quiz.bestScore() / 10.0);
            }
        }

        List<Double> gradedAssignmentScoresOutOf10 = new ArrayList<>();
        long submittedAssignmentsCount = 0;
        long onTimeAssignmentsCount = 0;
        for (AssignmentStatusRow assignment : assignments) {
            if (assignment.submitted()) {
                submittedAssignmentsCount++;
                if (assignment.dueAt() == null
                        || (assignment.submittedAt() != null && !assignment.submittedAt().isAfter(assignment.dueAt()))) {
                    onTimeAssignmentsCount++;
                }
                if (assignment.rawScore() != null && assignment.maxScore() > 0) {
                    gradedAssignmentScoresOutOf10.add((assignment.rawScore() / assignment.maxScore()) * 10.0);
                }
            }
        }

        Double averageQuizScoreOutOf10 = averageNullable(quizBestScoresOutOf10);
        Double quizPassRate = attemptedQuizzesCount > 0
                ? roundOneDecimal(((double) passedQuizzesCount / attemptedQuizzesCount) * 100.0)
                : null;
        Double averageAssignmentScoreOutOf10 = averageNullable(gradedAssignmentScoresOutOf10);

        List<Double> combinedScores = new ArrayList<>(quizBestScoresOutOf10);
        combinedScores.addAll(gradedAssignmentScoresOutOf10);
        Double overallAverageScoreOutOf10 = averageNullable(combinedScores);

        StudentAnalyticsSummaryDto summary = new StudentAnalyticsSummaryDto(
                courses.size(),
                totalLessons,
                completedLessons,
                completionRate,
                overallAverageScoreOutOf10,
                averageQuizScoreOutOf10,
                quizPassRate,
                attemptedQuizzesCount,
                passedQuizzesCount,
                averageAssignmentScoreOutOf10,
                assignments.size(),
                submittedAssignmentsCount,
                onTimeAssignmentsCount,
                streaks.currentStreakDays(),
                streaks.longestStreakDays(),
                activeDaysInWindow,
                roundOneDecimal(totalWindowSeconds / 3600.0),
                completedLessonsInWindow,
                roundOneDecimal(currentWeekSeconds / 3600.0),
                currentWeekActiveDays
        );

        return new StudentLearningAnalyticsOverviewResponse(
                days,
                summary,
                currentWeekActivity,
                windowDailyActivity,
                scoreTrend,
                coursePerformances,
                focusItems
        );
    }

    @Transactional(readOnly = true)
    public StudentCourseAnalyticsResponse getCourseAnalytics(UUID studentId, UUID courseId) {
        Objects.requireNonNull(studentId, "studentId must not be null");
        Objects.requireNonNull(courseId, "courseId must not be null");
        users.requireActiveStudent(studentId);

        EnrolledCourseMetaRow meta = repository.checkCourseAccess(studentId, courseId);
        if (!meta.courseExists()) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
        }
        if (!meta.enrolled()) {
            throw new BusinessException(
                    HttpStatus.FORBIDDEN,
                    "ENROLLMENT_REQUIRED",
                    "Bạn cần ghi danh khóa học để tiếp tục"
            );
        }

        Instant now = Instant.now(clock);
        LocalDate todayVn = now.atZone(BUSINESS_ZONE).toLocalDate();

        CourseOverviewRow targetCourse = repository.findEnrolledCourses(studentId).stream()
                .filter(c -> c.courseId().equals(courseId))
                .findFirst()
                .orElse(new CourseOverviewRow(meta.courseId(), meta.courseTitle(), meta.courseSlug(), 0, 0, null));

        List<QuizStatusRow> quizzes = repository.findQuizStatuses(studentId, courseId);
        List<AssignmentStatusRow> assignments = repository.findAssignmentStatuses(studentId, courseId);

        StudentCoursePerformanceSummaryDto courseSummary = buildCoursePerformances(
                List.of(targetCourse),
                quizzes,
                assignments
        ).get(0);

        List<StudentCourseQuizItemDto> quizItems = quizzes.stream()
                .map(q -> new StudentCourseQuizItemDto(
                        q.quizId(),
                        q.lessonId(),
                        q.lessonTitle(),
                        q.sectionTitle(),
                        roundTwoDecimals(q.passingScore() / 10.0),
                        q.bestScore() != null ? roundTwoDecimals(q.bestScore() / 10.0) : null,
                        q.latestScore() != null ? roundTwoDecimals(q.latestScore() / 10.0) : null,
                        Boolean.TRUE.equals(q.bestPassed()),
                        q.attemptCount(),
                        q.lastAttemptAt()
                ))
                .toList();

        List<StudentCourseAssignmentItemDto> assignmentItems = assignments.stream()
                .map(a -> {
                    boolean late = a.dueAt() != null && (a.submitted()
                            ? (a.submittedAt() != null && a.submittedAt().isAfter(a.dueAt()))
                            : now.isAfter(a.dueAt()));
                    Double scoreOutOf10 = (a.rawScore() != null && a.maxScore() > 0)
                            ? roundTwoDecimals((a.rawScore() / a.maxScore()) * 10.0)
                            : null;
                    return new StudentCourseAssignmentItemDto(
                            a.assignmentId(),
                            a.title(),
                            a.dueAt(),
                            a.maxScore(),
                            a.submitted(),
                            a.submittedAt(),
                            late,
                            a.rawScore(),
                            scoreOutOf10,
                            a.gradedAt()
                    );
                })
                .toList();

        List<StudentFocusItemDto> focusItems = buildFocusItems(
                List.of(targetCourse),
                quizzes,
                assignments,
                now,
                todayVn
        );

        return new StudentCourseAnalyticsResponse(courseSummary, quizItems, assignmentItems, focusItems);
    }

    public StreakMetrics calculateStreaks(List<LocalDate> activeDatesDesc, LocalDate todayVn) {
        if (activeDatesDesc == null || activeDatesDesc.isEmpty()) {
            return new StreakMetrics(0, 0);
        }
        Set<LocalDate> uniqueDates = new HashSet<>(activeDatesDesc);

        LocalDate cursor = null;
        if (uniqueDates.contains(todayVn)) {
            cursor = todayVn;
        } else if (uniqueDates.contains(todayVn.minusDays(1))) {
            cursor = todayVn.minusDays(1);
        }

        int currentStreak = 0;
        while (cursor != null && uniqueDates.contains(cursor)) {
            currentStreak++;
            cursor = cursor.minusDays(1);
        }

        List<LocalDate> sortedAsc = uniqueDates.stream().sorted().toList();
        int longestStreak = 0;
        int run = 0;
        LocalDate previous = null;
        for (LocalDate current : sortedAsc) {
            if (previous != null && previous.plusDays(1).equals(current)) {
                run++;
            } else {
                run = 1;
            }
            if (run > longestStreak) {
                longestStreak = run;
            }
            previous = current;
        }

        return new StreakMetrics(currentStreak, longestStreak);
    }

    private List<StudentDailyActivityDto> buildCurrentWeekSeries(
            LocalDate weekStartVn,
            LocalDate todayVn,
            Map<LocalDate, DailyMetricRow> dailyByDate
    ) {
        List<StudentDailyActivityDto> result = new ArrayList<>(7);
        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStartVn.plusDays(i);
            DailyMetricRow metric = date.isAfter(todayVn) ? null : dailyByDate.get(date);
            long seconds = metric != null ? metric.studySeconds() : 0L;
            long lessons = metric != null ? metric.completedLessons() : 0L;
            result.add(new StudentDailyActivityDto(
                    DATE_KEY_FORMATTER.format(date),
                    shortWeekdayLabel(date.getDayOfWeek()),
                    fullWeekdayLabel(date.getDayOfWeek()) + ", " + SHORT_DATE_FORMATTER.format(date),
                    roundTwoDecimals(seconds / 3600.0),
                    (int) Math.round(seconds / 60.0),
                    lessons,
                    date.equals(todayVn)
            ));
        }
        return result;
    }

    private List<StudentDailyActivityDto> buildWindowSeries(
            LocalDate windowStartVn,
            LocalDate todayVn,
            Map<LocalDate, DailyMetricRow> dailyByDate
    ) {
        long daysBetween = ChronoUnit.DAYS.between(windowStartVn, todayVn) + 1;
        List<StudentDailyActivityDto> result = new ArrayList<>((int) daysBetween);
        for (int i = 0; i < daysBetween; i++) {
            LocalDate date = windowStartVn.plusDays(i);
            DailyMetricRow metric = dailyByDate.get(date);
            long seconds = metric != null ? metric.studySeconds() : 0L;
            long lessons = metric != null ? metric.completedLessons() : 0L;
            result.add(new StudentDailyActivityDto(
                    DATE_KEY_FORMATTER.format(date),
                    SHORT_DATE_FORMATTER.format(date),
                    fullWeekdayLabel(date.getDayOfWeek()) + ", " + SHORT_DATE_FORMATTER.format(date),
                    roundTwoDecimals(seconds / 3600.0),
                    (int) Math.round(seconds / 60.0),
                    lessons,
                    date.equals(todayVn)
            ));
        }
        return result;
    }

    private List<StudentCoursePerformanceSummaryDto> buildCoursePerformances(
            List<CourseOverviewRow> courses,
            List<QuizStatusRow> quizzes,
            List<AssignmentStatusRow> assignments
    ) {
        Map<UUID, List<QuizStatusRow>> quizzesByCourse = new HashMap<>();
        for (QuizStatusRow quiz : quizzes) {
            quizzesByCourse.computeIfAbsent(quiz.courseId(), ignored -> new ArrayList<>()).add(quiz);
        }

        Map<UUID, List<AssignmentStatusRow>> assignmentsByCourse = new HashMap<>();
        for (AssignmentStatusRow assignment : assignments) {
            assignmentsByCourse.computeIfAbsent(assignment.courseId(), ignored -> new ArrayList<>()).add(assignment);
        }

        List<StudentCoursePerformanceSummaryDto> result = new ArrayList<>(courses.size());
        for (CourseOverviewRow course : courses) {
            List<QuizStatusRow> courseQuizzes = quizzesByCourse.getOrDefault(course.courseId(), List.of());
            List<AssignmentStatusRow> courseAssignments = assignmentsByCourse.getOrDefault(course.courseId(), List.of());

            List<Double> quizScores = new ArrayList<>();
            long attemptedQuizzes = 0;
            long passedQuizzes = 0;
            for (QuizStatusRow q : courseQuizzes) {
                if (q.attemptCount() > 0 && q.bestScore() != null) {
                    attemptedQuizzes++;
                    if (Boolean.TRUE.equals(q.bestPassed())) {
                        passedQuizzes++;
                    }
                    quizScores.add(q.bestScore() / 10.0);
                }
            }

            List<Double> assignmentScores = new ArrayList<>();
            long submittedAssignments = 0;
            for (AssignmentStatusRow a : courseAssignments) {
                if (a.submitted()) {
                    submittedAssignments++;
                    if (a.rawScore() != null && a.maxScore() > 0) {
                        assignmentScores.add((a.rawScore() / a.maxScore()) * 10.0);
                    }
                }
            }

            long safeCompleted = Math.min(course.completedLessons(), course.totalLessons());
            int percent = course.totalLessons() > 0
                    ? (int) Math.min(100, Math.round(((double) safeCompleted / course.totalLessons()) * 100.0))
                    : 0;

            result.add(new StudentCoursePerformanceSummaryDto(
                    course.courseId(),
                    course.courseTitle(),
                    course.courseSlug(),
                    course.totalLessons(),
                    safeCompleted,
                    percent,
                    averageNullable(quizScores),
                    attemptedQuizzes,
                    courseQuizzes.size(),
                    passedQuizzes,
                    averageNullable(assignmentScores),
                    submittedAssignments,
                    courseAssignments.size(),
                    course.lastActivityAt()
            ));
        }
        return result;
    }

    private List<StudentScoreTrendPointDto> buildScoreTrend(
            List<QuizStatusRow> quizzes,
            List<AssignmentStatusRow> assignments
    ) {
        List<StudentScoreTrendPointDto> points = new ArrayList<>();
        for (QuizStatusRow q : quizzes) {
            if (q.attemptCount() > 0 && q.bestScore() != null && q.lastAttemptAt() != null) {
                points.add(new StudentScoreTrendPointDto(
                        q.quizId().toString(),
                        q.lessonTitle(),
                        "QUIZ",
                        q.courseId(),
                        q.courseTitle(),
                        roundTwoDecimals(q.bestScore() / 10.0),
                        Boolean.TRUE.equals(q.bestPassed()),
                        q.lastAttemptAt()
                ));
            }
        }
        for (AssignmentStatusRow a : assignments) {
            if (a.submitted() && a.rawScore() != null && a.maxScore() > 0 && a.gradedAt() != null) {
                double score10 = roundTwoDecimals((a.rawScore() / a.maxScore()) * 10.0);
                points.add(new StudentScoreTrendPointDto(
                        a.assignmentId().toString(),
                        a.title(),
                        "ASSIGNMENT",
                        a.courseId(),
                        a.courseTitle(),
                        score10,
                        score10 >= 5.0,
                        a.gradedAt()
                ));
            }
        }

        points.sort(Comparator.comparing(StudentScoreTrendPointDto::recordedAt));
        if (points.size() > MAX_SCORE_TREND_POINTS) {
            return new ArrayList<>(points.subList(points.size() - MAX_SCORE_TREND_POINTS, points.size()));
        }
        return points;
    }

    private List<StudentFocusItemDto> buildFocusItems(
            List<CourseOverviewRow> courses,
            List<QuizStatusRow> quizzes,
            List<AssignmentStatusRow> assignments,
            Instant now,
            LocalDate todayVn
    ) {
        List<StudentFocusItemDto> highPriority = new ArrayList<>();
        List<StudentFocusItemDto> mediumPriority = new ArrayList<>();

        for (QuizStatusRow q : quizzes) {
            if (q.attemptCount() > 0 && !Boolean.TRUE.equals(q.bestPassed()) && q.bestScore() != null) {
                double bestOutOf10 = q.bestScore() / 10.0;
                double passingOutOf10 = q.passingScore() / 10.0;
                highPriority.add(new StudentFocusItemDto(
                        "quiz-" + q.quizId(),
                        "FAILED_QUIZ",
                        "HIGH",
                        q.lessonTitle(),
                        String.format(
                                Locale.US,
                                "Điểm cao nhất %.1f/10 · Cần đạt %.1f/10 (%d lần làm)",
                                bestOutOf10,
                                passingOutOf10,
                                q.attemptCount()
                        ),
                        q.courseId(),
                        q.courseTitle(),
                        "/learning/lessons/" + q.lessonId(),
                        "Làm lại quiz"
                ));
            }
        }

        Instant dueSoonLimit = now.plus(DUE_SOON_WINDOW_DAYS, ChronoUnit.DAYS);
        for (AssignmentStatusRow a : assignments) {
            if (a.submitted() || a.dueAt() == null) {
                continue;
            }
            if (a.dueAt().isBefore(now)) {
                long overdueDays = Math.max(
                        1L,
                        ChronoUnit.DAYS.between(a.dueAt().atZone(BUSINESS_ZONE).toLocalDate(), todayVn)
                );
                highPriority.add(new StudentFocusItemDto(
                        "assignment-" + a.assignmentId(),
                        "OVERDUE_ASSIGNMENT",
                        "HIGH",
                        a.title(),
                        "Đã quá hạn nộp " + overdueDays + " ngày",
                        a.courseId(),
                        a.courseTitle(),
                        "/learning/assignments",
                        "Nộp bài ngay"
                ));
            } else if (!a.dueAt().isAfter(dueSoonLimit)) {
                long hoursLeft = ChronoUnit.HOURS.between(now, a.dueAt());
                String remainingText = hoursLeft < 24
                        ? "Còn " + Math.max(1L, hoursLeft) + " giờ đến hạn nộp"
                        : "Còn " + Math.max(1L, (long) Math.ceil(hoursLeft / 24.0)) + " ngày đến hạn nộp";
                mediumPriority.add(new StudentFocusItemDto(
                        "assignment-" + a.assignmentId(),
                        "DUE_SOON_ASSIGNMENT",
                        "MEDIUM",
                        a.title(),
                        remainingText,
                        a.courseId(),
                        a.courseTitle(),
                        "/learning/assignments",
                        "Làm bài tập"
                ));
            }
        }

        for (CourseOverviewRow c : courses) {
            if (c.totalLessons() > 0 && c.completedLessons() < c.totalLessons() && c.lastActivityAt() != null) {
                long inactiveDays = ChronoUnit.DAYS.between(
                        c.lastActivityAt().atZone(BUSINESS_ZONE).toLocalDate(),
                        todayVn
                );
                if (inactiveDays >= INACTIVE_COURSE_THRESHOLD_DAYS) {
                    mediumPriority.add(new StudentFocusItemDto(
                            "course-" + c.courseId(),
                            "INACTIVE_COURSE",
                            "MEDIUM",
                            c.courseTitle(),
                            "Đã " + inactiveDays + " ngày chưa có hoạt động học mới",
                            c.courseId(),
                            c.courseTitle(),
                            "/learning/courses/" + c.courseId(),
                            "Tiếp tục học"
                    ));
                }
            }
        }

        List<StudentFocusItemDto> combined = new ArrayList<>(highPriority.size() + mediumPriority.size());
        combined.addAll(highPriority);
        combined.addAll(mediumPriority);
        if (combined.size() > MAX_FOCUS_ITEMS) {
            return new ArrayList<>(combined.subList(0, MAX_FOCUS_ITEMS));
        }
        return combined;
    }

    private Double averageNullable(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        double sum = 0.0;
        for (double v : values) {
            sum += v;
        }
        return roundTwoDecimals(sum / values.size());
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String shortWeekdayLabel(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "T2";
            case TUESDAY -> "T3";
            case WEDNESDAY -> "T4";
            case THURSDAY -> "T5";
            case FRIDAY -> "T6";
            case SATURDAY -> "T7";
            case SUNDAY -> "CN";
        };
    }

    private String fullWeekdayLabel(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "Thứ 2";
            case TUESDAY -> "Thứ 3";
            case WEDNESDAY -> "Thứ 4";
            case THURSDAY -> "Thứ 5";
            case FRIDAY -> "Thứ 6";
            case SATURDAY -> "Thứ 7";
            case SUNDAY -> "Chủ nhật";
        };
    }

    public record StreakMetrics(int currentStreakDays, int longestStreakDays) {
    }
}
