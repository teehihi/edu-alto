package com.edualto.course.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.domain.Lesson;
import com.edualto.course.domain.LessonStatus;
import com.edualto.course.domain.LessonType;
import com.edualto.course.dto.LearningCourseResponse;
import com.edualto.course.dto.LearningLessonResponse;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.LessonRepository;
import com.edualto.course.repository.SectionRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CourseLearningAccessService {
    private final CourseRepository courses;
    private final LessonRepository lessons;
    private final SectionRepository sections;

    public CourseLearningAccessService(CourseRepository courses, LessonRepository lessons, SectionRepository sections) {
        this.courses = courses;
        this.lessons = lessons;
        this.sections = sections;
    }

    public LearningCourseResponse requirePublishedCourse(UUID courseId) {
        Course course = courses.findById(courseId)
                .filter(item -> item.getStatus() == CourseStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        return new LearningCourseResponse(course.getId(), course.getInstructorId(), course.getPrice());
    }

    @Transactional
    public LearningCourseResponse requireCourseForEnrollment(UUID courseId) {
        Course course = courses.findForEnrollment(courseId)
                .filter(item -> item.getStatus() == CourseStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        return new LearningCourseResponse(course.getId(), course.getInstructorId(), course.getPrice());
    }

    public LearningLessonResponse requirePublishedLesson(UUID lessonId) {
        Lesson lesson = lessons.findById(lessonId)
                .filter(item -> item.getStatus() == LessonStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "LESSON_NOT_FOUND", "Không tìm thấy bài học"));
        UUID courseId = sections.findById(lesson.getSectionId()).orElseThrow().getCourseId();
        requirePublishedCourse(courseId);
        return new LearningLessonResponse(lesson.getId(), courseId, lesson.getSectionId(), lesson.getTitle(),
                lesson.getLessonType(), lesson.getLessonType() == LessonType.TEXT ? lesson.getContent() : null);
    }
}
