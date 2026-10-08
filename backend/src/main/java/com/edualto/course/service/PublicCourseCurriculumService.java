package com.edualto.course.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.domain.Section;
import com.edualto.course.dto.CourseCurriculumLessonResponse;
import com.edualto.course.dto.CourseCurriculumResponse;
import com.edualto.course.dto.CourseCurriculumSectionResponse;
import com.edualto.course.dto.CourseLessonPreviewResponse;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicCourseCurriculumService {

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;

    public PublicCourseCurriculumService(
            CourseRepository courseRepository,
            SectionRepository sectionRepository,
            LessonRepository lessonRepository
    ) {
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.lessonRepository = lessonRepository;
    }

    @Transactional(readOnly = true)
    public CourseCurriculumResponse getCurriculum(String slug) {
        Course course = getPublishedCourse(slug);
        List<Section> sections = sectionRepository.findAllByCourseIdOrderByPositionAsc(course.getId());
        if (sections.isEmpty()) {
            return new CourseCurriculumResponse(course.getId(), course.getSlug(), List.of());
        }

        List<UUID> sectionIds = sections.stream().map(Section::getId).toList();
        Map<UUID, List<Lesson>> lessonsBySection = lessonRepository.findAllBySectionIdInOrderByPositionAsc(sectionIds).stream()
                .filter(lesson -> lesson.getStatus() == LessonStatus.PUBLISHED)
                .collect(Collectors.groupingBy(Lesson::getSectionId));

        List<CourseCurriculumSectionResponse> sectionResponses = sections.stream()
                .map(section -> new CourseCurriculumSectionResponse(
                        section.getId(),
                        section.getTitle(),
                        section.getIntroduction(),
                        section.getDescription(),
                        lessonsBySection.getOrDefault(section.getId(), List.of()).stream()
                                .map(lesson -> new CourseCurriculumLessonResponse(
                                        lesson.getId(),
                                        lesson.getTitle(),
                                        lesson.getLessonType(),
                                        lesson.getDurationSeconds(),
                                        lesson.isPreview() && lesson.getLessonType() == LessonType.TEXT
                                ))
                                .toList()
                ))
                .toList();

        return new CourseCurriculumResponse(course.getId(), course.getSlug(), sectionResponses);
    }

    @Transactional(readOnly = true)
    public CourseLessonPreviewResponse getTextPreview(String slug, UUID lessonId) {
        Course course = getPublishedCourse(slug);
        Lesson lesson = lessonRepository.findById(lessonId)
                .filter(item -> item.getStatus() == LessonStatus.PUBLISHED && item.isPreview() && item.getLessonType() == LessonType.TEXT)
                .orElseThrow(this::lessonNotFound);
        boolean belongsToCourse = sectionRepository.findByIdAndCourseId(lesson.getSectionId(), course.getId()).isPresent();
        if (!belongsToCourse) {
            throw lessonNotFound();
        }
        return new CourseLessonPreviewResponse(lesson.getId(), lesson.getTitle(), lesson.getLessonType(), lesson.getContent());
    }

    private Course getPublishedCourse(String slug) {
        if (slug == null || slug.isBlank()) {
            throw courseNotFound();
        }
        return courseRepository.findBySlugAndStatus(slug.trim(), CourseStatus.PUBLISHED)
                .orElseThrow(this::courseNotFound);
    }

    private BusinessException courseNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
    }

    private BusinessException lessonNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học xem trước");
    }
}
