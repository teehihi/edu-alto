package com.edualto.learning;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.domain.LearningActivity;
import com.edualto.learning.domain.LearningActivityType;
import com.edualto.learning.dto.LearningActivityResponse;
import com.edualto.learning.dto.LearningActivitySummaryResponse;
import com.edualto.learning.dto.LearningActivitySyncResponse;
import com.edualto.learning.dto.LearningActivityTypeInfoDto;
import com.edualto.learning.dto.RecordLearningActivityRequest;
import com.edualto.learning.repository.LearningActivityRepository;
import com.edualto.learning.service.LearningActivityService;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;

@ExtendWith(MockitoExtension.class)
class LearningActivityServiceTest {

    @Mock
    private LearningActivityRepository activityRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private EnrollmentService enrollmentService;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private LearningActivityService service;

    private final UUID studentId = UUID.randomUUID();
    private final UUID instructorId = UUID.randomUUID();
    private final UUID courseId = UUID.randomUUID();
    private final UUID sectionId = UUID.randomUUID();
    private final UUID lessonId = UUID.randomUUID();

    private Course sampleCourse;
    private Lesson sampleLesson;

    @BeforeEach
    void setUp() {
        service = new LearningActivityService(activityRepository, courseRepository, lessonRepository, enrollmentService, jdbcTemplate);

        sampleCourse = new Course(
                courseId,
                instructorId,
                "Lập trình Spring Boot chuyên sâu",
                "lap-trinh-spring-boot-chuyen-sau",
                "Tagline khóa học",
                "Mô tả khóa học",
                BigDecimal.valueOf(499000),
                BigDecimal.valueOf(499000),
                CourseLevel.INTERMEDIATE,
                "vi",
                null
        );
        sampleCourse.publish();

        sampleLesson = new Lesson(
                lessonId,
                sectionId,
                "Bài 1: Kiến trúc REST API",
                "bai-1-kien-truc-rest-api",
                "Mô tả bài học",
                "Nội dung bài học",
                LessonType.TEXT,
                1,
                600,
                true,
                null,
                LessonStatus.PUBLISHED
        );
    }

    @Test
    void recordActivity_CourseEnrolled_SavesWithoutEnrollmentCheck() {
        RecordLearningActivityRequest request = new RecordLearningActivityRequest(
                courseId,
                null,
                null,
                LearningActivityType.COURSE_ENROLLED,
                Instant.now(),
                "{\"source\": \"direct_checkout\"}"
        );

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(sampleCourse));
        when(activityRepository.save(any(LearningActivity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearningActivityResponse response = service.recordActivity(studentId, request);

        assertThat(response).isNotNull();
        assertThat(response.courseId()).isEqualTo(sampleCourse.getId());
        assertThat(response.courseTitle()).isEqualTo(sampleCourse.getTitle());
        assertThat(response.activityType()).isEqualTo(LearningActivityType.COURSE_ENROLLED);
        assertThat(response.activityDisplayName()).isEqualTo("Ghi danh khóa học");
        assertThat(response.activityCategory()).isEqualTo("COURSE");
    }

    @Test
    void recordActivity_LessonViewed_RequiresEnrollmentAndResolvesLesson() {
        RecordLearningActivityRequest request = new RecordLearningActivityRequest(
                courseId,
                sectionId,
                lessonId,
                LearningActivityType.LESSON_VIEWED,
                Instant.now(),
                null
        );

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(sampleCourse));
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(sampleLesson));
        when(activityRepository.save(any(LearningActivity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearningActivityResponse response = service.recordActivity(studentId, request);

        verify(enrollmentService).requireEnrollment(studentId, sampleCourse.getId());
        assertThat(response.lessonId()).isEqualTo(sampleLesson.getId());
        assertThat(response.lessonTitle()).isEqualTo(sampleLesson.getTitle());
        assertThat(response.activityType()).isEqualTo(LearningActivityType.LESSON_VIEWED);
    }

    @Test
    void recordActivity_FutureTimestamp_ThrowsBadRequest() {
        Instant farFuture = Instant.now().plus(Duration.ofHours(2));
        RecordLearningActivityRequest request = new RecordLearningActivityRequest(
                courseId,
                null,
                null,
                LearningActivityType.LESSON_VIEWED,
                farFuture,
                null
        );

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(sampleCourse));

        assertThatThrownBy(() -> service.recordActivity(studentId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST)
                .hasMessageContaining("không thể vượt quá thời gian hiện tại");
    }

    @Test
    void recordActivity_InvalidMetadataJson_ThrowsBadRequest() {
        RecordLearningActivityRequest request = new RecordLearningActivityRequest(
                courseId,
                null,
                null,
                LearningActivityType.COURSE_ENROLLED,
                Instant.now(),
                "{not-valid-json"
        );

        when(courseRepository.findById(courseId)).thenReturn(Optional.of(sampleCourse));

        assertThatThrownBy(() -> service.recordActivity(studentId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.BAD_REQUEST)
                .hasFieldOrPropertyWithValue("code", "INVALID_ACTIVITY_METADATA");
    }

    @Test
    void getStudentActivities_FiltersByCourseAndTime() {
        Instant from = Instant.now().minus(Duration.ofDays(7));
        Instant to = Instant.now();
        PageRequest pageable = PageRequest.of(0, 10);

        LearningActivity activity = new LearningActivity(
                studentId,
                courseId,
                sectionId,
                lessonId,
                LearningActivityType.VIDEO_WATCHED,
                Instant.now().minus(Duration.ofHours(1)),
                "{\"duration_seconds\": 320}"
        );

        Page<LearningActivity> mockPage = new PageImpl<>(List.of(activity), pageable, 1);
        when(activityRepository.findByStudentIdAndCourseIdAndOccurredAtBetweenOrderByOccurredAtDesc(
                studentId, courseId, from, to, pageable
        )).thenReturn(mockPage);
        when(courseRepository.findAllById(any())).thenReturn(List.of(sampleCourse));
        when(lessonRepository.findAllById(any())).thenReturn(List.of(sampleLesson));

        Page<LearningActivityResponse> result = service.getStudentActivities(studentId, courseId, from, to, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).activityType()).isEqualTo(LearningActivityType.VIDEO_WATCHED);
        assertThat(result.getContent().get(0).activityDisplayName()).isEqualTo("Theo dõi video bài giảng");
    }

    @Test
    void getCourseActivitiesForInstructor_WhenNotInstructor_ThrowsForbidden() {
        UUID otherInstructorId = UUID.randomUUID();
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(sampleCourse));

        assertThatThrownBy(() -> service.getCourseActivitiesForInstructor(otherInstructorId, courseId, null, null, PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("status", HttpStatus.FORBIDDEN);
    }

    @Test
    void getStandardizedActivityTypes_ReturnsAll14StandardTypes() {
        List<LearningActivityTypeInfoDto> types = service.getStandardizedActivityTypes();

        assertThat(types).hasSize(14);
        assertThat(types).extracting(LearningActivityTypeInfoDto::name)
                .contains(
                        "COURSE_ENROLLED",
                        "COURSE_COMPLETED",
                        "CERTIFICATE_ISSUED",
                        "LESSON_VIEWED",
                        "LESSON_COMPLETED",
                        "VIDEO_WATCHED",
                        "NOTE_CREATED",
                        "RESOURCE_DOWNLOADED",
                        "QUIZ_STARTED",
                        "QUIZ_SUBMITTED",
                        "ASSIGNMENT_SUBMITTED",
                        "ASSIGNMENT_GRADED",
                        "QUESTION_ASKED",
                        "COMMENT_POSTED"
                );
    }

    @Test
    void recordActivityDirect_WhenNotExists_SavesActivity() {
        UUID sourceId = UUID.randomUUID();
        when(activityRepository.existsBySourceIdAndActivityType(sourceId, LearningActivityType.LESSON_COMPLETED))
                .thenReturn(false);
        when(activityRepository.save(any(LearningActivity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LearningActivity result = service.recordActivityDirect(
                studentId,
                courseId,
                sectionId,
                lessonId,
                LearningActivityType.LESSON_COMPLETED,
                sourceId,
                Instant.now(),
                "{\"completed\": true}"
        );

        assertThat(result).isNotNull();
        assertThat(result.getSourceId()).isEqualTo(sourceId);
        assertThat(result.getActivityType()).isEqualTo(LearningActivityType.LESSON_COMPLETED);
        verify(activityRepository).save(any(LearningActivity.class));
    }

    @Test
    void recordActivityDirect_WhenAlreadyExists_ReturnsNullAndDoesNotSave() {
        UUID sourceId = UUID.randomUUID();
        when(activityRepository.existsBySourceIdAndActivityType(sourceId, LearningActivityType.LESSON_COMPLETED))
                .thenReturn(true);

        LearningActivity result = service.recordActivityDirect(
                studentId,
                courseId,
                sectionId,
                lessonId,
                LearningActivityType.LESSON_COMPLETED,
                sourceId,
                Instant.now(),
                "{\"completed\": true}"
        );

        assertThat(result).isNull();
        verify(activityRepository, never()).save(any(LearningActivity.class));
    }

    @Test
    void syncHistoricalActivities_ExecutesBatchAndReturnsCounts() {
        when(jdbcTemplate.update(any(String.class))).thenReturn(5, 3, 2, 4, 1);
        when(activityRepository.count()).thenReturn(15L);

        LearningActivitySyncResponse response = service.syncHistoricalActivities();

        assertThat(response).isNotNull();
        assertThat(response.lessonsSynced()).isEqualTo(5);
        assertThat(response.quizzesSynced()).isEqualTo(3);
        assertThat(response.assignmentsSynced()).isEqualTo(6);
        assertThat(response.enrollmentsSynced()).isEqualTo(1);
        assertThat(response.totalActivities()).isEqualTo(15L);
    }

    @Test
    void getStudentSummary_ReturnsAggregatedMetrics() {
        when(activityRepository.countByStudentId(studentId)).thenReturn(25L);
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), eq(studentId)))
                .thenReturn(7L);
        doAnswer(invocation -> {
            RowCallbackHandler rch = invocation.getArgument(1);
            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getString("activity_type")).thenReturn("LESSON_COMPLETED");
            when(rs1.getLong("cnt")).thenReturn(15L);
            rch.processRow(rs1);

            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getString("activity_type")).thenReturn("QUIZ_SUBMITTED");
            when(rs2.getLong("cnt")).thenReturn(6L);
            rch.processRow(rs2);

            ResultSet rs3 = mock(ResultSet.class);
            when(rs3.getString("activity_type")).thenReturn("ASSIGNMENT_SUBMITTED");
            when(rs3.getLong("cnt")).thenReturn(4L);
            rch.processRow(rs3);
            return null;
        }).when(jdbcTemplate).query(anyString(), any(RowCallbackHandler.class), eq(studentId));

        LearningActivitySummaryResponse summary = service.getStudentSummary(studentId);

        assertThat(summary).isNotNull();
        assertThat(summary.totalActivities()).isEqualTo(25L);
        assertThat(summary.distinctActiveDays()).isEqualTo(7L);
        assertThat(summary.countByCategory()).containsEntry("LESSON", 15L);
        assertThat(summary.countByCategory()).containsEntry("ASSESSMENT", 10L);
    }
}
