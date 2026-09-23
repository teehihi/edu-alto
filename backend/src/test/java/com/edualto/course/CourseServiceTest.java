package com.edualto.course;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.CourseDetailResponse;
import com.edualto.course.dto.CourseThumbnailUploadUrlRequest;
import com.edualto.course.dto.CourseThumbnailUploadUrlResponse;
import com.edualto.course.dto.CreateCourseRequest;
import com.edualto.course.dto.InstructorCourseResponse;
import com.edualto.course.dto.UpdateCourseRequest;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.service.CourseService;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProfileRepository profileRepository;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private CourseService courseService;

    private UUID instructorId;
    private User instructorUser;
    private Role instructorRole;

    @BeforeEach
    void setUp() {
        instructorRole = new Role(RoleName.INSTRUCTOR, "Giảng viên");
        instructorUser = new User("Giảng Viên A", "instructor@edualto.com", "hash");
        instructorUser.addRole(instructorRole);
        instructorId = instructorUser.getId();
    }

    @Test
    void createCourseSuccessfullyGeneratesSlugAndDraftStatus() {
        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));
        when(courseRepository.existsBySlug("khoa-hoc-spring-boot-3")).thenReturn(false);
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateCourseRequest request = new CreateCourseRequest(
                "Khóa học Spring Boot 3",
                null,
                "Làm chủ Backend với Java",
                "Nội dung chi tiết khóa học từ cơ bản tới nâng cao.",
                BigDecimal.valueOf(499000),
                BigDecimal.valueOf(999000),
                CourseLevel.INTERMEDIATE,
                "vi",
                null
        );

        InstructorCourseResponse response = courseService.createCourse(instructorId, request);

        assertThat(response).isNotNull();
        assertThat(response.title()).isEqualTo("Khóa học Spring Boot 3");
        assertThat(response.slug()).isEqualTo("khoa-hoc-spring-boot-3");
        assertThat(response.status()).isEqualTo(CourseStatus.DRAFT);
        assertThat(response.price()).isEqualByComparingTo("499000");
        assertThat(response.originalPrice()).isEqualByComparingTo("999000");
        assertThat(response.level()).isEqualTo(CourseLevel.INTERMEDIATE);
    }

    @Test
    void createCourseRejectsWhenOriginalPriceIsLessThanPrice() {
        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));

        CreateCourseRequest request = new CreateCourseRequest(
                "Khóa học React",
                null,
                "Tagline",
                "Description",
                BigDecimal.valueOf(500000),
                BigDecimal.valueOf(300000), // Original price < price
                CourseLevel.BEGINNER,
                "vi",
                null
        );

        assertThatThrownBy(() -> courseService.createCourse(instructorId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_COURSE_PRICE");
    }

    @Test
    void createCourseRejectsNonInstructorUser() {
        User studentUser = new User("Học Viên B", "student@edualto.com", "hash");
        studentUser.addRole(new Role(RoleName.STUDENT, "Học viên"));
        when(userRepository.findById(instructorId)).thenReturn(Optional.of(studentUser));

        CreateCourseRequest request = new CreateCourseRequest(
                "Khóa học Node.js",
                null,
                "Tagline",
                "Description",
                BigDecimal.ZERO,
                null,
                CourseLevel.ALL_LEVELS,
                "vi",
                null
        );

        assertThatThrownBy(() -> courseService.createCourse(instructorId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "FORBIDDEN");
    }

    @Test
    void publishCourseSetsStatusAndPublishedAt() {
        Course course = new Course(
                UUID.randomUUID(),
                instructorId,
                "Khóa học Flutter",
                "khoa-hoc-flutter",
                "Tagline",
                "Mô tả chi tiết",
                BigDecimal.valueOf(200000),
                BigDecimal.valueOf(400000),
                CourseLevel.BEGINNER,
                "vi",
                null
        );

        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InstructorCourseResponse response = courseService.publishCourse(instructorId, course.getId());

        assertThat(response.status()).isEqualTo(CourseStatus.PUBLISHED);
        assertThat(response.publishedAt()).isNotNull();
    }

    @Test
    void publishCourseRejectsUnauthorizedInstructor() {
        UUID otherInstructorId = UUID.randomUUID();
        Course course = new Course(
                UUID.randomUUID(),
                instructorId,
                "Khóa học Docker",
                "khoa-hoc-docker",
                "Tagline",
                "Mô tả",
                BigDecimal.ZERO,
                null,
                CourseLevel.ALL_LEVELS,
                "vi",
                null
        );

        when(courseRepository.findById(course.getId())).thenReturn(Optional.of(course));

        assertThatThrownBy(() -> courseService.publishCourse(otherInstructorId, course.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "UNAUTHORIZED_COURSE_ACCESS");
    }

    @Test
    void getPublicCourseBySlugReturnsPublishedCourse() {
        Course course = new Course(
                UUID.randomUUID(),
                instructorId,
                "Khóa học Kubernetes",
                "khoa-hoc-kubernetes",
                "Tagline",
                "Mô tả Kubernetes",
                BigDecimal.valueOf(300000),
                null,
                CourseLevel.ADVANCED,
                "vi",
                "courses/thumbnails/k8s.png"
        );
        course.publish();

        Profile profile = new Profile(instructorId, "Chuyên gia DevOps", "10 năm kinh nghiệm", "avatars/devops.png");
        profile.setCustomHandle("devops-pro");

        when(courseRepository.findBySlugAndStatus("khoa-hoc-kubernetes", CourseStatus.PUBLISHED))
                .thenReturn(Optional.of(course));
        when(userRepository.findAllById(Set.of(instructorId))).thenReturn(List.of(instructorUser));
        when(profileRepository.findAllById(Set.of(instructorId))).thenReturn(List.of(profile));
        when(storageService.getPublicUrl("courses/thumbnails/k8s.png")).thenReturn("https://cdn.edualto.com/courses/thumbnails/k8s.png");
        when(storageService.getPublicUrl("avatars/devops.png")).thenReturn("https://cdn.edualto.com/avatars/devops.png");

        CourseDetailResponse response = courseService.getPublicCourseBySlug("khoa-hoc-kubernetes");

        assertThat(response).isNotNull();
        assertThat(response.title()).isEqualTo("Khóa học Kubernetes");
        assertThat(response.thumbnailUrl()).isEqualTo("https://cdn.edualto.com/courses/thumbnails/k8s.png");
        assertThat(response.instructor()).isNotNull();
        assertThat(response.instructor().fullName()).isEqualTo(instructorUser.getFullName());
        assertThat(response.instructor().headline()).isEqualTo("Chuyên gia DevOps");
        assertThat(response.instructor().customHandle()).isEqualTo("devops-pro");
        assertThat(response.instructor().avatarUrl()).isEqualTo("https://cdn.edualto.com/avatars/devops.png");
    }

    @Test
    void getPublicCourseBySlugThrowsNotFoundWhenDraft() {
        when(courseRepository.findBySlugAndStatus("khoa-hoc-draft", CourseStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> courseService.getPublicCourseBySlug("khoa-hoc-draft"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "COURSE_NOT_FOUND");
    }

    @Test
    void generateThumbnailUploadUrlRejectsInvalidContentType() {
        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));

        CourseThumbnailUploadUrlRequest request = new CourseThumbnailUploadUrlRequest("application/pdf", 1024L);

        assertThatThrownBy(() -> courseService.generateThumbnailUploadUrl(instructorId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_CONTENT_TYPE");
    }

    @Test
    void generateThumbnailUploadUrlRejectsOversizedFile() {
        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));

        CourseThumbnailUploadUrlRequest request = new CourseThumbnailUploadUrlRequest("image/png", 6L * 1024 * 1024);

        assertThatThrownBy(() -> courseService.generateThumbnailUploadUrl(instructorId, request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_FILE_SIZE");
    }

    @Test
    void generateThumbnailUploadUrlGeneratesPresignedUrl() {
        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));
        when(storageService.generatePresignedUploadUrl(any(), eq("image/png"), eq(2048L), any(Duration.class)))
                .thenReturn(new PresignedUploadUrl("https://r2.edualto.com/upload", "courses/thumbnails/test.png", Instant.now().plus(Duration.ofMinutes(15))));

        CourseThumbnailUploadUrlRequest request = new CourseThumbnailUploadUrlRequest("image/png", 2048L);

        CourseThumbnailUploadUrlResponse response = courseService.generateThumbnailUploadUrl(instructorId, request);

        assertThat(response.uploadUrl()).isEqualTo("https://r2.edualto.com/upload");
        assertThat(response.objectKey()).startsWith("courses/thumbnails/" + instructorId + "/");
    }
}
