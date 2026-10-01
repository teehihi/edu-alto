package com.edualto.enrollment.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.dto.LearningCourseResponse;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.service.CourseLearningAccessService;
import com.edualto.enrollment.domain.Enrollment;
import com.edualto.enrollment.domain.EnrollmentStatus;
import com.edualto.enrollment.dto.EnrollmentResponse;
import com.edualto.enrollment.dto.InstructorCourseStudentResponse;
import com.edualto.enrollment.repository.EnrollmentRepository;
import com.edualto.user.service.UserService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnrollmentService {
    private final EnrollmentRepository enrollments;
    private final CourseLearningAccessService courses;
    private final CourseRepository courseRepository;
    private final UserService users;

    public EnrollmentService(
            EnrollmentRepository enrollments,
            CourseLearningAccessService courses,
            CourseRepository courseRepository,
            UserService users
    ) {
        this.enrollments = enrollments;
        this.courses = courses;
        this.courseRepository = courseRepository;
        this.users = users;
    }

    @Transactional
    public UUID enroll(UUID studentId, UUID courseId) {
        users.requireActiveStudent(studentId);
        LearningCourseResponse course = courses.requireCourseForEnrollment(courseId);
        if (course.instructorId().equals(studentId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "OWN_COURSE_ENROLLMENT", "Bạn không thể ghi danh khóa học do mình giảng dạy");
        }
        Enrollment existing = enrollments.findByStudentIdAndCourseId(studentId, courseId).orElse(null);
        if (existing != null) {
            return existing.getId();
        }
        if (course.price().signum() > 0) {
            throw new BusinessException(HttpStatus.CONFLICT, "PAYMENT_REQUIRED", "Khóa học này cần được thanh toán trước khi ghi danh");
        }
        enrollments.insertIfAbsent(UUID.randomUUID(), studentId, courseId);
        return enrollments.findByStudentIdAndCourseId(studentId, courseId).orElseThrow().getId();
    }

    @Transactional(readOnly = true)
    public UUID requireEnrollment(UUID studentId, UUID courseId) {
        users.requireActiveStudent(studentId);
        return enrollments.findByStudentIdAndCourseId(studentId, courseId)
                .filter(item -> item.getStatus() == EnrollmentStatus.ACTIVE)
                .map(Enrollment::getId)
                .orElseThrow(() -> new BusinessException(HttpStatus.FORBIDDEN, "ENROLLMENT_REQUIRED", "Bạn cần ghi danh khóa học để tiếp tục"));
    }

    @Transactional(readOnly = true)
    public Page<EnrollmentResponse> getHistory(UUID studentId, int page, int size, String sort) {
        users.requireActiveStudent(studentId);
        if (page < 0 || size < 1 || size > 100 || !("enrolledAt,desc".equals(sort) || "enrolledAt,asc".equals(sort))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang không hợp lệ; kích thước từ 1 đến 100 và sắp xếp theo ngày ghi danh");
        }
        Sort.Direction direction = sort.endsWith(",asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        return enrollments.findHistory(studentId, PageRequest.of(page, size, Sort.by(direction, "enrolledAt").and(Sort.by("id"))));
    }

    @Transactional(readOnly = true)
    public Page<InstructorCourseStudentResponse> getInstructorCourseStudents(
            UUID instructorId,
            UUID courseId,
            int page,
            int size,
            String search
    ) {
        users.requireActiveInstructor(instructorId);
        validatePagination(page, size);

        Course course = courseRepository.findByIdAndInstructorId(courseId, instructorId)
                .orElseThrow(() -> new BusinessException(
                        HttpStatus.NOT_FOUND,
                        "COURSE_NOT_FOUND",
                        "Không tìm thấy khóa học"
                ));

        String normalizedSearch = search == null ? null : search.trim();
        if (normalizedSearch != null && normalizedSearch.isEmpty()) {
            normalizedSearch = null;
        }
        if (normalizedSearch != null && normalizedSearch.length() > 160) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SEARCH", "Từ khóa tìm kiếm không được vượt quá 160 ký tự");
        }

        return enrollments.findInstructorCourseStudents(
                course.getId(),
                EnrollmentStatus.ACTIVE,
                normalizedSearch,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "enrolledAt").and(Sort.by(Sort.Direction.ASC, "studentId")))
        );
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang không hợp lệ; kích thước từ 1 đến 100");
        }
    }
}
