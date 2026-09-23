package com.edualto.course;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.domain.Section;
import com.edualto.course.dto.CourseStructureResponse;
import com.edualto.course.dto.CreateLessonRequest;
import com.edualto.course.dto.CreateSectionRequest;
import com.edualto.course.dto.LessonResponse;
import com.edualto.course.dto.ReorderItemRequest;
import com.edualto.course.dto.ReorderLessonsRequest;
import com.edualto.course.dto.ReorderSectionsRequest;
import com.edualto.course.dto.SectionResponse;
import com.edualto.course.dto.UpdateLessonRequest;
import com.edualto.course.dto.UpdateSectionRequest;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import com.edualto.course.service.CourseStructureService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseStructureServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CourseStructureService courseStructureService;

    private UUID instructorId;
    private UUID courseId;
    private User instructorUser;
    private Course testCourse;

    @BeforeEach
    void setUp() {
        instructorUser = new User("Giảng viên A", "instructor@edualto.com", "hash123");
        instructorUser.addRole(new Role(RoleName.INSTRUCTOR, "Giảng viên"));
        instructorId = instructorUser.getId();

        courseId = UUID.randomUUID();
        testCourse = new Course(
                courseId,
                instructorId,
                "Lập trình Spring Boot 3",
                "lap-trinh-spring-boot-3",
                "Học từ cơ bản đến nâng cao",
                "Mô tả chi tiết khóa học",
                BigDecimal.valueOf(499000),
                BigDecimal.valueOf(899000),
                CourseLevel.BEGINNER,
                "vi",
                null
        );
    }

    @Test
    @DisplayName("Tạo Section thành công với vị trí tự động tăng")
    void createSection_success() {
        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(testCourse));
        when(sectionRepository.findTopByCourseIdOrderByPositionDesc(courseId)).thenReturn(Optional.empty());
        when(sectionRepository.save(any(Section.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateSectionRequest request = new CreateSectionRequest("Chương 1: Tổng quan", "Giới thiệu cơ bản");
        SectionResponse response = courseStructureService.createSection(instructorId, courseId, request);

        assertThat(response.title()).isEqualTo("Chương 1: Tổng quan");
        assertThat(response.description()).isEqualTo("Giới thiệu cơ bản");
        assertThat(response.position()).isEqualTo(1);
        verify(sectionRepository).save(any(Section.class));
    }

    @Test
    @DisplayName("Tạo Section thất bại nếu không phải chủ sở hữu khóa học (Forbidden)")
    void createSection_forbiddenIfNotOwner() {
        UUID otherInstructorId = UUID.randomUUID();
        User otherUser = new User("Other", "other@edualto.com", "hash");
        otherUser.addRole(new Role(RoleName.INSTRUCTOR, "Giảng viên"));

        when(userRepository.findById(otherInstructorId)).thenReturn(Optional.of(otherUser));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(testCourse));

        CreateSectionRequest request = new CreateSectionRequest("Chương 1", "Mô tả");

        assertThatThrownBy(() -> courseStructureService.createSection(otherInstructorId, courseId, request))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> {
                    BusinessException be = (BusinessException) e;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(be.getMessage()).contains("quyền");
                });
    }

    @Test
    @DisplayName("Cập nhật Section thành công")
    void updateSection_success() {
        UUID sectionId = UUID.randomUUID();
        Section section = new Section(sectionId, courseId, "Tiêu đề cũ", "Mô tả cũ", 1);

        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(testCourse));
        when(sectionRepository.findById(sectionId)).thenReturn(Optional.of(section));
        when(sectionRepository.save(any(Section.class))).thenAnswer(inv -> inv.getArgument(0));
        when(lessonRepository.findAllBySectionIdOrderByPositionAsc(sectionId)).thenReturn(List.of());

        UpdateSectionRequest request = new UpdateSectionRequest("Tiêu đề mới", "Mô tả mới");
        SectionResponse response = courseStructureService.updateSection(instructorId, courseId, sectionId, request);

        assertThat(response.title()).isEqualTo("Tiêu đề mới");
        assertThat(response.description()).isEqualTo("Mô tả mới");
    }

    @Test
    @DisplayName("Sắp xếp lại các Section thành công")
    void reorderSections_success() {
        UUID s1 = UUID.randomUUID();
        UUID s2 = UUID.randomUUID();
        Section sec1 = new Section(s1, courseId, "Chương 1", "Mô tả 1", 1);
        Section sec2 = new Section(s2, courseId, "Chương 2", "Mô tả 2", 2);

        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(testCourse));
        when(sectionRepository.findAllByCourseIdOrderByPositionAsc(courseId)).thenReturn(List.of(sec1, sec2));
        when(lessonRepository.findAllBySectionIdInOrderByPositionAsc(any())).thenReturn(List.of());

        ReorderSectionsRequest request = new ReorderSectionsRequest(List.of(
                new ReorderItemRequest(s1, 2),
                new ReorderItemRequest(s2, 1)
        ));

        List<SectionResponse> responses = courseStructureService.reorderSections(instructorId, courseId, request);

        assertThat(responses).hasSize(2);
        assertThat(sec1.getPosition()).isEqualTo(2);
        assertThat(sec2.getPosition()).isEqualTo(1);
        verify(sectionRepository).saveAll(any());
    }

    @Test
    @DisplayName("Tạo Lesson thành công với slug tự động và vị trí tự tăng")
    void createLesson_success() {
        UUID sectionId = UUID.randomUUID();
        Section section = new Section(sectionId, courseId, "Chương 1", null, 1);

        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(testCourse));
        when(sectionRepository.findById(sectionId)).thenReturn(Optional.of(section));
        when(lessonRepository.findTopBySectionIdOrderByPositionDesc(sectionId)).thenReturn(Optional.empty());
        when(lessonRepository.save(any(Lesson.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateLessonRequest request = new CreateLessonRequest(
                "Bài 1: Giới thiệu Spring Boot",
                null,
                "Mô tả bài 1",
                "# Nội dung bài học",
                LessonType.TEXT,
                600,
                true,
                null
        );

        LessonResponse response = courseStructureService.createLesson(instructorId, courseId, sectionId, request);

        assertThat(response.title()).isEqualTo("Bài 1: Giới thiệu Spring Boot");
        assertThat(response.slug()).isEqualTo("bai-1-gioi-thieu-spring-boot");
        assertThat(response.position()).isEqualTo(1);
        assertThat(response.durationSeconds()).isEqualTo(600);
        assertThat(response.isPreview()).isTrue();
        assertThat(response.status()).isEqualTo(LessonStatus.DRAFT);
    }

    @Test
    @DisplayName("Lấy toàn bộ Course Structure với batch query lessons")
    void getCourseStructure_success() {
        UUID s1 = UUID.randomUUID();
        Section sec1 = new Section(s1, courseId, "Chương 1", "Mô tả 1", 1);

        Lesson l1 = new Lesson(UUID.randomUUID(), s1, "Bài 1", "bai-1", null, "Content", LessonType.TEXT, 1, 300, true, null, LessonStatus.DRAFT);
        Lesson l2 = new Lesson(UUID.randomUUID(), s1, "Bài 2", "bai-2", null, "Content", LessonType.VIDEO, 2, 600, false, "videos/v2.mp4", LessonStatus.DRAFT);

        when(userRepository.findById(instructorId)).thenReturn(Optional.of(instructorUser));
        when(courseRepository.findById(courseId)).thenReturn(Optional.of(testCourse));
        when(sectionRepository.findAllByCourseIdOrderByPositionAsc(courseId)).thenReturn(List.of(sec1));
        when(lessonRepository.findAllBySectionIdInOrderByPositionAsc(List.of(s1))).thenReturn(List.of(l1, l2));

        CourseStructureResponse structure = courseStructureService.getCourseStructure(instructorId, courseId);

        assertThat(structure.totalSections()).isEqualTo(1);
        assertThat(structure.totalLessons()).isEqualTo(2);
        assertThat(structure.totalDurationSeconds()).isEqualTo(900);
        assertThat(structure.sections()).hasSize(1);
        assertThat(structure.sections().getFirst().lessons()).hasSize(2);
    }
}
