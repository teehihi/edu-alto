package com.edualto.review.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.repository.CourseRepository;
import com.edualto.enrollment.domain.EnrollmentStatus;
import com.edualto.enrollment.repository.EnrollmentRepository;
import com.edualto.review.domain.CourseReview;
import com.edualto.review.domain.ReviewStatus;
import com.edualto.review.dto.CourseReviewRequest;
import com.edualto.review.dto.CourseReviewResponse;
import com.edualto.review.dto.CourseReviewSummaryResponse;
import com.edualto.review.repository.CourseReviewRepository;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.service.UserService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CourseReviewService {
    private static final BigDecimal EMPTY_AVERAGE = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private final CourseReviewRepository reviews;
    private final EnrollmentRepository enrollments;
    private final CourseRepository courses;
    private final UserService users;

    public CourseReviewService(
            CourseReviewRepository reviews,
            EnrollmentRepository enrollments,
            CourseRepository courses,
            UserService users
    ) {
        this.reviews = reviews;
        this.enrollments = enrollments;
        this.courses = courses;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Page<CourseReviewResponse> listPublished(UUID courseId, int page, int size) {
        requirePublishedCourse(courseId);
        validatePagination(page, size);
        return reviews.findPublicReviews(
                courseId,
                ReviewStatus.PUBLISHED,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id")))
        );
    }

    @Transactional(readOnly = true)
    public CourseReviewSummaryResponse getSummary(UUID courseId) {
        requirePublishedCourse(courseId);
        BigDecimal average = reviews.getAverageRating(courseId, ReviewStatus.PUBLISHED);
        return new CourseReviewSummaryResponse(
                courseId,
                average == null ? EMPTY_AVERAGE : average.setScale(2, RoundingMode.HALF_UP),
                reviews.countByCourseIdAndStatus(courseId, ReviewStatus.PUBLISHED)
        );
    }

    @Transactional
    public CourseReviewResponse upsertOwnReview(UUID studentId, UUID courseId, CourseReviewRequest request) {
        users.requireActiveStudent(studentId);
        Course course = courses.findById(courseId).orElseThrow(() -> courseNotFound());
        if (course.getInstructorId().equals(studentId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "OWN_COURSE_REVIEW", "Bạn không thể đánh giá khóa học do mình giảng dạy");
        }
        enrollments.findByStudentIdAndCourseId(studentId, courseId)
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(HttpStatus.FORBIDDEN, "ENROLLMENT_REQUIRED", "Bạn cần ghi danh khóa học để gửi đánh giá"));

        String comment = request.comment().trim();
        reviews.upsertReview(UUID.randomUUID(), studentId, courseId, request.rating(), comment);
        CourseReview saved = reviews.findByStudentIdAndCourseId(studentId, courseId).orElseThrow();
        return toResponse(saved, users.requireById(studentId).getFullName());
    }

    @Transactional
    public CourseReviewResponse setVisibility(UUID instructorId, UUID courseId, UUID reviewId, boolean published) {
        User instructor = users.requireById(instructorId);
        if (instructor.getStatus() != UserStatus.ACTIVE
                || instructor.getRoles().stream().noneMatch(role -> role.getName() == RoleName.INSTRUCTOR)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "INSTRUCTOR_REQUIRED", "Chức năng này dành cho giảng viên đang hoạt động");
        }
        Course course = courses.findByIdAndInstructorId(courseId, instructorId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
        CourseReview review = reviews.findById(reviewId)
                .filter(item -> item.getCourseId().equals(course.getId()))
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "REVIEW_NOT_FOUND", "Không tìm thấy đánh giá"));
        review.setStatus(published ? ReviewStatus.PUBLISHED : ReviewStatus.HIDDEN);
        CourseReview saved = reviews.save(review);
        return toResponse(saved, users.requireById(saved.getStudentId()).getFullName());
    }

    private Course requirePublishedCourse(UUID courseId) {
        return courses.findById(courseId)
                .filter(course -> course.getStatus() == CourseStatus.PUBLISHED)
                .orElseThrow(() -> courseNotFound());
    }

    private BusinessException courseNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang không hợp lệ; kích thước từ 1 đến 100");
        }
    }

    private CourseReviewResponse toResponse(CourseReview review, String studentName) {
        return new CourseReviewResponse(
                review.getId(), review.getCourseId(), review.getStudentId(), studentName,
                review.getRating(), review.getComment(), review.getStatus().name(),
                review.getCreatedAt(), review.getUpdatedAt()
        );
    }
}
