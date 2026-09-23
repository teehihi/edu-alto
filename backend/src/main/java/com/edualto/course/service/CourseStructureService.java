package com.edualto.course.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.common.util.SlugUtils;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.domain.Section;
import com.edualto.course.dto.CourseStructureLessonResponse;
import com.edualto.course.dto.CourseStructureResponse;
import com.edualto.course.dto.CourseStructureSectionResponse;
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
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CourseStructureService {

    private static final Logger log = LoggerFactory.getLogger(CourseStructureService.class);

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;

    public CourseStructureService(
            CourseRepository courseRepository,
            SectionRepository sectionRepository,
            LessonRepository lessonRepository,
            UserRepository userRepository
    ) {
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.lessonRepository = lessonRepository;
        this.userRepository = userRepository;
    }

    // ==========================================
    // Course Structure Overview
    // ==========================================

    @Transactional(readOnly = true)
    public CourseStructureResponse getCourseStructure(UUID instructorId, UUID courseId) {
        Course course = getCourseAndCheckOwnership(instructorId, courseId);
        List<Section> sections = sectionRepository.findAllByCourseIdOrderByPositionAsc(courseId);

        if (sections.isEmpty()) {
            return new CourseStructureResponse(
                    course.getId(),
                    course.getTitle(),
                    course.getSlug(),
                    0,
                    0,
                    0,
                    Collections.emptyList()
            );
        }

        List<UUID> sectionIds = sections.stream().map(Section::getId).toList();
        List<Lesson> allLessons = lessonRepository.findAllBySectionIdInOrderByPositionAsc(sectionIds);

        Map<UUID, List<Lesson>> lessonsBySectionId = allLessons.stream()
                .collect(Collectors.groupingBy(Lesson::getSectionId));

        int totalLessonsCount = allLessons.size();
        int totalCourseDuration = allLessons.stream()
                .mapToInt(l -> l.getDurationSeconds() != null ? l.getDurationSeconds() : 0)
                .sum();

        List<CourseStructureSectionResponse> sectionResponses = new ArrayList<>();
        for (Section section : sections) {
            List<Lesson> sectionLessons = lessonsBySectionId.getOrDefault(section.getId(), Collections.emptyList());
            int sectionDuration = sectionLessons.stream()
                    .mapToInt(l -> l.getDurationSeconds() != null ? l.getDurationSeconds() : 0)
                    .sum();

            List<CourseStructureLessonResponse> lessonDtos = sectionLessons.stream()
                    .map(l -> new CourseStructureLessonResponse(
                            l.getId(),
                            l.getTitle(),
                            l.getSlug(),
                            l.getDescription(),
                            l.getLessonType(),
                            l.getPosition(),
                            l.getDurationSeconds(),
                            l.isPreview(),
                            l.getStatus()
                    ))
                    .toList();

            sectionResponses.add(new CourseStructureSectionResponse(
                    section.getId(),
                    section.getTitle(),
                    section.getDescription(),
                    section.getPosition(),
                    sectionLessons.size(),
                    sectionDuration,
                    lessonDtos
            ));
        }

        return new CourseStructureResponse(
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                sections.size(),
                totalLessonsCount,
                totalCourseDuration,
                sectionResponses
        );
    }

    // ==========================================
    // Section Management
    // ==========================================

    @Transactional
    public SectionResponse createSection(UUID instructorId, UUID courseId, CreateSectionRequest request) {
        getCourseAndCheckOwnership(instructorId, courseId);

        int nextPosition = sectionRepository.findTopByCourseIdOrderByPositionDesc(courseId)
                .map(s -> s.getPosition() + 1)
                .orElse(1);

        Section section = Section.create(
                courseId,
                request.title(),
                request.description(),
                nextPosition
        );

        section = sectionRepository.save(section);
        return toSectionResponse(section, 0, 0);
    }

    @Transactional(readOnly = true)
    public List<SectionResponse> getSections(UUID instructorId, UUID courseId) {
        getCourseAndCheckOwnership(instructorId, courseId);
        List<Section> sections = sectionRepository.findAllByCourseIdOrderByPositionAsc(courseId);

        if (sections.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> sectionIds = sections.stream().map(Section::getId).toList();
        List<Lesson> lessons = lessonRepository.findAllBySectionIdInOrderByPositionAsc(sectionIds);
        Map<UUID, List<Lesson>> lessonsBySection = lessons.stream()
                .collect(Collectors.groupingBy(Lesson::getSectionId));

        return sections.stream().map(sec -> {
            List<Lesson> secLessons = lessonsBySection.getOrDefault(sec.getId(), Collections.emptyList());
            int duration = secLessons.stream()
                    .mapToInt(l -> l.getDurationSeconds() != null ? l.getDurationSeconds() : 0)
                    .sum();
            return toSectionResponse(sec, secLessons.size(), duration);
        }).toList();
    }

    @Transactional(readOnly = true)
    public SectionResponse getSectionById(UUID instructorId, UUID courseId, UUID sectionId) {
        getCourseAndCheckOwnership(instructorId, courseId);
        Section section = getSectionAndCheckCourse(courseId, sectionId);
        List<Lesson> lessons = lessonRepository.findAllBySectionIdOrderByPositionAsc(sectionId);
        int duration = lessons.stream()
                .mapToInt(l -> l.getDurationSeconds() != null ? l.getDurationSeconds() : 0)
                .sum();
        return toSectionResponse(section, lessons.size(), duration);
    }

    @Transactional
    public SectionResponse updateSection(UUID instructorId, UUID courseId, UUID sectionId, UpdateSectionRequest request) {
        getCourseAndCheckOwnership(instructorId, courseId);
        Section section = getSectionAndCheckCourse(courseId, sectionId);

        section.update(request.title(), request.description());
        section = sectionRepository.save(section);

        List<Lesson> lessons = lessonRepository.findAllBySectionIdOrderByPositionAsc(sectionId);
        int duration = lessons.stream()
                .mapToInt(l -> l.getDurationSeconds() != null ? l.getDurationSeconds() : 0)
                .sum();

        return toSectionResponse(section, lessons.size(), duration);
    }

    @Transactional
    public void deleteSection(UUID instructorId, UUID courseId, UUID sectionId) {
        getCourseAndCheckOwnership(instructorId, courseId);
        Section section = getSectionAndCheckCourse(courseId, sectionId);

        lessonRepository.deleteAllBySectionId(sectionId);
        sectionRepository.delete(section);

        // Re-index remaining sections to keep positions contiguous
        List<Section> remaining = sectionRepository.findAllByCourseIdOrderByPositionAsc(courseId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).updatePosition(i + 1);
        }
        sectionRepository.saveAll(remaining);
    }

    @Transactional
    public List<SectionResponse> reorderSections(UUID instructorId, UUID courseId, ReorderSectionsRequest request) {
        getCourseAndCheckOwnership(instructorId, courseId);
        List<Section> currentSections = sectionRepository.findAllByCourseIdOrderByPositionAsc(courseId);
        Map<UUID, Section> sectionMap = currentSections.stream()
                .collect(Collectors.toMap(Section::getId, s -> s));

        Set<UUID> requestIds = new HashSet<>();
        Set<Integer> requestPositions = new HashSet<>();

        for (ReorderItemRequest item : request.items()) {
            if (!sectionMap.containsKey(item.id())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SECTION_ID", "Chương học không thuộc khóa học này: " + item.id());
            }
            if (!requestIds.add(item.id())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "DUPLICATE_REORDER_ID", "Trùng lặp mã chương học trong yêu cầu sắp xếp");
            }
            if (!requestPositions.add(item.position())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "DUPLICATE_REORDER_POSITION", "Trùng lặp vị trí sắp xếp chương học");
            }
        }

        // Apply new positions
        for (ReorderItemRequest item : request.items()) {
            Section section = sectionMap.get(item.id());
            section.updatePosition(item.position());
        }

        sectionRepository.saveAll(currentSections);
        return getSections(instructorId, courseId);
    }

    // ==========================================
    // Lesson Management
    // ==========================================

    @Transactional
    public LessonResponse createLesson(UUID instructorId, UUID courseId, UUID sectionId, CreateLessonRequest request) {
        getCourseAndCheckOwnership(instructorId, courseId);
        getSectionAndCheckCourse(courseId, sectionId);

        int nextPosition = lessonRepository.findTopBySectionIdOrderByPositionDesc(sectionId)
                .map(l -> l.getPosition() + 1)
                .orElse(1);

        String slug = request.slug();
        if (slug == null || slug.isBlank()) {
            slug = SlugUtils.toSlug(request.title());
        } else {
            slug = SlugUtils.toSlug(slug);
        }

        Lesson lesson = Lesson.create(
                sectionId,
                request.title(),
                slug,
                request.description(),
                request.content(),
                request.lessonType() != null ? request.lessonType() : LessonType.TEXT,
                nextPosition,
                request.durationSeconds(),
                Boolean.TRUE.equals(request.isPreview()),
                request.mediaKey()
        );

        lesson = lessonRepository.save(lesson);
        return toLessonResponse(lesson);
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> getLessons(UUID instructorId, UUID courseId, UUID sectionId) {
        getCourseAndCheckOwnership(instructorId, courseId);
        getSectionAndCheckCourse(courseId, sectionId);

        return lessonRepository.findAllBySectionIdOrderByPositionAsc(sectionId).stream()
                .map(this::toLessonResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonResponse getLessonById(UUID instructorId, UUID courseId, UUID sectionId, UUID lessonId) {
        getCourseAndCheckOwnership(instructorId, courseId);
        getSectionAndCheckCourse(courseId, sectionId);
        Lesson lesson = getLessonAndCheckSection(sectionId, lessonId);

        return toLessonResponse(lesson);
    }

    @Transactional
    public LessonResponse updateLesson(UUID instructorId, UUID courseId, UUID sectionId, UUID lessonId, UpdateLessonRequest request) {
        getCourseAndCheckOwnership(instructorId, courseId);
        getSectionAndCheckCourse(courseId, sectionId);
        Lesson lesson = getLessonAndCheckSection(sectionId, lessonId);

        String slug = request.slug();
        if (slug != null && !slug.isBlank()) {
            slug = SlugUtils.toSlug(slug);
        } else {
            slug = lesson.getSlug();
        }

        lesson.update(
                request.title(),
                slug,
                request.description(),
                request.content(),
                request.lessonType(),
                request.durationSeconds(),
                Boolean.TRUE.equals(request.isPreview()),
                request.mediaKey(),
                request.status()
        );

        lesson = lessonRepository.save(lesson);
        return toLessonResponse(lesson);
    }

    @Transactional
    public void deleteLesson(UUID instructorId, UUID courseId, UUID sectionId, UUID lessonId) {
        getCourseAndCheckOwnership(instructorId, courseId);
        getSectionAndCheckCourse(courseId, sectionId);
        Lesson lesson = getLessonAndCheckSection(sectionId, lessonId);

        lessonRepository.delete(lesson);

        // Re-index remaining lessons to keep positions contiguous
        List<Lesson> remaining = lessonRepository.findAllBySectionIdOrderByPositionAsc(sectionId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).updatePosition(i + 1);
        }
        lessonRepository.saveAll(remaining);
    }

    @Transactional
    public List<LessonResponse> reorderLessons(UUID instructorId, UUID courseId, UUID sectionId, ReorderLessonsRequest request) {
        getCourseAndCheckOwnership(instructorId, courseId);
        getSectionAndCheckCourse(courseId, sectionId);

        List<Lesson> currentLessons = lessonRepository.findAllBySectionIdOrderByPositionAsc(sectionId);
        Map<UUID, Lesson> lessonMap = currentLessons.stream()
                .collect(Collectors.toMap(Lesson::getId, l -> l));

        Set<UUID> requestIds = new HashSet<>();
        Set<Integer> requestPositions = new HashSet<>();

        for (ReorderItemRequest item : request.items()) {
            if (!lessonMap.containsKey(item.id())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_LESSON_ID", "Bài học không thuộc chương học này: " + item.id());
            }
            if (!requestIds.add(item.id())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "DUPLICATE_REORDER_ID", "Trùng lặp mã bài học trong yêu cầu sắp xếp");
            }
            if (!requestPositions.add(item.position())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "DUPLICATE_REORDER_POSITION", "Trùng lặp vị trí sắp xếp bài học");
            }
        }

        // Apply new positions
        for (ReorderItemRequest item : request.items()) {
            Lesson lesson = lessonMap.get(item.id());
            lesson.updatePosition(item.position());
        }

        lessonRepository.saveAll(currentLessons);
        return getLessons(instructorId, courseId, sectionId);
    }

    // ==========================================
    // Security & Helper Methods
    // ==========================================

    private void validateInstructor(UUID instructorId) {
        User user = userRepository.findById(instructorId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        boolean isInstructor = user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleName.INSTRUCTOR || role.getName() == RoleName.ADMIN);
        if (!isInstructor) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền giảng viên để thực hiện thao tác này");
        }
    }

    private Course getCourseAndCheckOwnership(UUID instructorId, UUID courseId) {
        validateInstructor(instructorId);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));

        if (!course.getInstructorId().equals(instructorId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "UNAUTHORIZED_COURSE_ACCESS", "Bạn không có quyền thao tác trên khóa học này");
        }
        return course;
    }

    private Section getSectionAndCheckCourse(UUID courseId, UUID sectionId) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "SECTION_NOT_FOUND", "Không tìm thấy chương học"));

        if (!section.getCourseId().equals(courseId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "SECTION_NOT_FOUND", "Chương học không thuộc khóa học này");
        }
        return section;
    }

    private Lesson getLessonAndCheckSection(UUID sectionId, UUID lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học"));

        if (!lesson.getSectionId().equals(sectionId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Bài học không thuộc chương học này");
        }
        return lesson;
    }

    private SectionResponse toSectionResponse(Section section, int lessonCount, int totalDurationSeconds) {
        return new SectionResponse(
                section.getId(),
                section.getCourseId(),
                section.getTitle(),
                section.getDescription(),
                section.getPosition(),
                lessonCount,
                totalDurationSeconds,
                section.getCreatedAt(),
                section.getUpdatedAt()
        );
    }

    private LessonResponse toLessonResponse(Lesson lesson) {
        return new LessonResponse(
                lesson.getId(),
                lesson.getSectionId(),
                lesson.getTitle(),
                lesson.getSlug(),
                lesson.getDescription(),
                lesson.getContent(),
                lesson.getLessonType(),
                lesson.getPosition(),
                lesson.getDurationSeconds(),
                lesson.isPreview(),
                lesson.getMediaKey(),
                lesson.getStatus(),
                lesson.getCreatedAt(),
                lesson.getUpdatedAt()
        );
    }
}
