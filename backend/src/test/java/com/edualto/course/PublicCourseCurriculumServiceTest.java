package com.edualto.course;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.domain.Section;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import com.edualto.course.service.PublicCourseCurriculumService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class PublicCourseCurriculumServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private LessonRepository lessonRepository;

    private PublicCourseCurriculumService service;
    private Course course;
    private Section section;

    @BeforeEach
    void setUp() {
        service = new PublicCourseCurriculumService(courseRepository, sectionRepository, lessonRepository);
        course = new Course(UUID.randomUUID(), UUID.randomUUID(), "Course", "course", null, "Description", BigDecimal.ZERO, null, CourseLevel.ALL_LEVELS, "vi", null);
        course.publish();
        section = new Section(
                UUID.randomUUID(),
                course.getId(),
                "Section",
                "Giới thiệu ngắn",
                "<p>Mô tả có <strong>định dạng</strong></p>",
                "Tiêu đề SEO",
                "Mô tả SEO",
                1
        );
        lenient().when(courseRepository.findBySlugAndStatus("course", course.getStatus())).thenReturn(Optional.of(course));
    }

    @Test
    void curriculumIncludesPublishedMetadataButFiltersDraftsAndUnsupportedPreviews() {
        Lesson textPreview = lesson("Text preview", LessonType.TEXT, true, LessonStatus.PUBLISHED, "secret content", null);
        Lesson videoPreview = lesson("Video", LessonType.VIDEO, true, LessonStatus.PUBLISHED, "secret notes", "private/video.mp4");
        Lesson draft = lesson("Draft", LessonType.TEXT, false, LessonStatus.DRAFT, "draft secret", null);
        when(sectionRepository.findAllByCourseIdOrderByPositionAsc(course.getId())).thenReturn(List.of(section));
        when(lessonRepository.findAllBySectionIdInOrderByPositionAsc(List.of(section.getId())))
                .thenReturn(List.of(textPreview, videoPreview, draft));

        var response = service.getCurriculum("course");

        assertThat(response.sections()).hasSize(1);
        assertThat(response.sections().get(0).introduction()).isEqualTo("Giới thiệu ngắn");
        assertThat(response.sections().get(0).description())
                .isEqualTo("<p>Mô tả có <strong>định dạng</strong></p>");
        assertThat(response.sections().get(0).lessons()).hasSize(2);
        assertThat(response.sections().get(0).lessons().get(0).preview()).isTrue();
        assertThat(response.sections().get(0).lessons().get(1).preview()).isFalse();
        assertThat(response.toString()).doesNotContain("secret", "private/video.mp4", "mediaKey", "content");
    }

    @Test
    void textPreviewRequiresPublishedPreviewTextLessonBelongingToCourse() {
        Lesson preview = lesson("Text preview", LessonType.TEXT, true, LessonStatus.PUBLISHED, "public preview", null);
        when(lessonRepository.findById(preview.getId())).thenReturn(Optional.of(preview));
        when(sectionRepository.findByIdAndCourseId(section.getId(), course.getId())).thenReturn(Optional.of(section));

        var response = service.getTextPreview("course", preview.getId());

        assertThat(response.textContent()).isEqualTo("public preview");
        assertThat(response.toString()).doesNotContain("mediaKey", "videoUrl");
    }

    @Test
    void textPreviewRejectsMissingCourseWrongCourseDraftAndNonPreviewLessons() {
        Lesson preview = lesson("Text preview", LessonType.TEXT, true, LessonStatus.PUBLISHED, "private", null);
        Lesson draft = lesson("Draft", LessonType.TEXT, true, LessonStatus.DRAFT, "private", null);
        Lesson notPreview = lesson("Not preview", LessonType.TEXT, false, LessonStatus.PUBLISHED, "private", null);
        when(lessonRepository.findById(preview.getId())).thenReturn(Optional.of(preview));
        when(sectionRepository.findByIdAndCourseId(section.getId(), course.getId())).thenReturn(Optional.empty());
        when(lessonRepository.findById(draft.getId())).thenReturn(Optional.of(draft));
        when(lessonRepository.findById(notPreview.getId())).thenReturn(Optional.of(notPreview));

        assertThatThrownBy(() -> service.getTextPreview("unknown", preview.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "COURSE_NOT_FOUND");
        assertThatThrownBy(() -> service.getTextPreview("course", preview.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "LESSON_NOT_FOUND");
        assertThatThrownBy(() -> service.getTextPreview("course", draft.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "LESSON_NOT_FOUND");
        assertThatThrownBy(() -> service.getTextPreview("course", notPreview.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("code", "LESSON_NOT_FOUND");
    }

    private Lesson lesson(String title, LessonType type, boolean preview, LessonStatus status, String content, String mediaKey) {
        return new Lesson(UUID.randomUUID(), section.getId(), title, title.toLowerCase().replace(' ', '-'), null, content, type, 1, 60, preview, mediaKey, status);
    }
}
