package com.edualto.assignment.service;

import com.edualto.assignment.domain.Assignment;
import com.edualto.assignment.domain.AssignmentStatus;
import com.edualto.assignment.domain.AssignmentSubmission;
import com.edualto.assignment.dto.AssignmentRequest;
import com.edualto.assignment.dto.AssignmentResponse;
import com.edualto.assignment.dto.GradeRequest;
import com.edualto.assignment.dto.SubmissionResponse;
import com.edualto.assignment.dto.SubmissionRequest;
import com.edualto.assignment.repository.AssignmentRepository;
import com.edualto.assignment.repository.AssignmentSubmissionRepository;
import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.repository.CourseRepository;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssignmentService {
    private final AssignmentRepository assignments;
    private final AssignmentSubmissionRepository submissions;
    private final CourseRepository courses;
    private final UserRepository users;

    public AssignmentService(AssignmentRepository assignments, AssignmentSubmissionRepository submissions,
            CourseRepository courses, UserRepository users) {
        this.assignments = assignments;
        this.submissions = submissions;
        this.courses = courses;
        this.users = users;
    }

    @Transactional
    public AssignmentResponse create(UUID instructorId, UUID courseId, AssignmentRequest request) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        Course course = courses.findByIdAndInstructorId(courseId, instructorId)
                .orElseThrow(() -> notFound("COURSE_NOT_FOUND", "Không tìm thấy khóa học của bạn"));
        validateDueAt(request.dueAt());
        Assignment assignment = assignments.save(new Assignment(courseId, instructorId, request.title(),
                request.description(), request.dueAt(), request.maxScore()));
        return toAssignmentResponse(assignment, course, null);
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> instructorList(UUID instructorId, UUID courseId) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        Course course = courses.findByIdAndInstructorId(courseId, instructorId)
                .orElseThrow(() -> notFound("COURSE_NOT_FOUND", "Không tìm thấy khóa học của bạn"));
        return assignments.findAllByCourseIdAndInstructorIdOrderByCreatedAtDesc(courseId, instructorId).stream()
                .map(item -> toAssignmentResponse(item, course, null)).toList();
    }

    @Transactional
    public AssignmentResponse update(UUID instructorId, UUID assignmentId, AssignmentRequest request) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        Assignment assignment = requireInstructorAssignment(instructorId, assignmentId);
        if (assignment.getStatus() == AssignmentStatus.ARCHIVED) {
            throw conflict("ASSIGNMENT_ARCHIVED", "Không thể chỉnh sửa bài tập đã lưu trữ");
        }
        validateDueAt(request.dueAt());
        List<AssignmentSubmission> graded = submissions.findAllByAssignmentIdOrderBySubmittedAtDesc(assignmentId);
        boolean scoreTooLow = graded.stream().anyMatch(submission -> submission.getScore() != null
                && submission.getScore().compareTo(request.maxScore()) > 0);
        if (scoreTooLow) {
            throw conflict("MAX_SCORE_BELOW_GRADE", "Điểm tối đa không thể thấp hơn điểm đã chấm");
        }
        assignment.update(request.title(), request.description(), request.dueAt(), request.maxScore());
        Course course = courses.findById(assignment.getCourseId()).orElseThrow();
        return toAssignmentResponse(assignment, course, null);
    }

    @Transactional
    public AssignmentResponse publish(UUID instructorId, UUID assignmentId) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        Assignment assignment = requireInstructorAssignment(instructorId, assignmentId);
        if (assignment.getStatus() == AssignmentStatus.ARCHIVED) {
            throw conflict("ASSIGNMENT_ARCHIVED", "Không thể xuất bản bài tập đã lưu trữ");
        }
        assignment.publish();
        Course course = courses.findById(assignment.getCourseId()).orElseThrow();
        if (course.getStatus() != CourseStatus.PUBLISHED) {
            throw conflict("COURSE_NOT_PUBLISHED", "Chỉ có thể xuất bản bài tập trong khóa học đang được xuất bản");
        }
        return toAssignmentResponse(assignment, course, null);
    }

    @Transactional
    public AssignmentResponse archive(UUID instructorId, UUID assignmentId) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        Assignment assignment = requireInstructorAssignment(instructorId, assignmentId);
        assignment.archive();
        Course course = courses.findById(assignment.getCourseId()).orElseThrow();
        return toAssignmentResponse(assignment, course, null);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> listSubmissions(UUID instructorId, UUID assignmentId) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        requireInstructorAssignment(instructorId, assignmentId);
        List<AssignmentSubmission> found = submissions.findAllByAssignmentIdOrderBySubmittedAtDesc(assignmentId);
        Map<UUID, User> students = users.findAllById(found.stream().map(AssignmentSubmission::getStudentId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return found.stream().map(item -> toSubmissionResponse(item, students.get(item.getStudentId()))).toList();
    }

    @Transactional
    public SubmissionResponse grade(UUID instructorId, UUID assignmentId, UUID submissionId, GradeRequest request) {
        requireRole(instructorId, RoleName.INSTRUCTOR);
        Assignment assignment = requireInstructorAssignment(instructorId, assignmentId);
        AssignmentSubmission submission = submissions.findById(submissionId)
                .filter(item -> item.getAssignmentId().equals(assignmentId))
                .orElseThrow(() -> notFound("SUBMISSION_NOT_FOUND", "Không tìm thấy bài nộp"));
        if (request.score().compareTo(assignment.getMaxScore()) > 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "SCORE_EXCEEDS_MAX", "Điểm không được vượt quá điểm tối đa của bài tập");
        }
        submission.grade(request.score(), request.feedback(), instructorId);
        User student = users.findById(submission.getStudentId()).orElse(null);
        return toSubmissionResponse(submission, student);
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> studentList(UUID studentId) {
        requireRole(studentId, RoleName.STUDENT);
        List<UUID> courseIds = assignments.findActiveCourseIdsForStudent(studentId).stream().distinct().toList();
        if (courseIds.isEmpty()) return List.of();
        List<Assignment> found = assignments.findAllByCourseIdInAndStatusOrderByDueAtAsc(courseIds, AssignmentStatus.PUBLISHED);
        Map<UUID, Course> courseMap = courses.findAllById(found.stream().map(Assignment::getCourseId).distinct().toList())
                .stream().collect(Collectors.toMap(Course::getId, Function.identity()));
        Map<UUID, AssignmentSubmission> submissionMap = submissions
                .findAllByAssignmentIdInAndStudentId(found.stream().map(Assignment::getId).toList(), studentId)
                .stream().collect(Collectors.toMap(AssignmentSubmission::getAssignmentId, Function.identity()));
        return found.stream().map(item -> toAssignmentResponse(item, courseMap.get(item.getCourseId()), submissionMap.get(item.getId())))
                .toList();
    }

    @Transactional
    public AssignmentResponse submit(UUID studentId, UUID assignmentId, SubmissionRequest request) {
        requireRole(studentId, RoleName.STUDENT);
        Assignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> notFound("ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập"));
        if (assignment.getStatus() != AssignmentStatus.PUBLISHED) {
            throw conflict("ASSIGNMENT_NOT_OPEN", "Bài tập hiện không nhận bài nộp");
        }
        if (!assignments.hasActiveEnrollment(studentId, assignment.getCourseId())) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ENROLLMENT_REQUIRED", "Bạn cần ghi danh khóa học để nộp bài");
        }
        if (assignment.getDueAt() != null && Instant.now().isAfter(assignment.getDueAt())) {
            throw conflict("ASSIGNMENT_DEADLINE_PASSED", "Đã quá hạn nộp bài tập");
        }
        AssignmentSubmission submission = submissions.findByAssignmentIdAndStudentId(assignmentId, studentId).orElse(null);
        if (submission == null) {
            submission = submissions.save(new AssignmentSubmission(assignmentId, studentId, request.responseText()));
        } else {
            if (submission.getScore() != null) {
                throw conflict("SUBMISSION_ALREADY_GRADED", "Bài nộp đã được chấm điểm và không thể chỉnh sửa");
            }
            submission.updateResponse(request.responseText());
        }
        Course course = courses.findById(assignment.getCourseId()).orElseThrow();
        return toAssignmentResponse(assignment, course, submission);
    }

    private Assignment requireInstructorAssignment(UUID instructorId, UUID assignmentId) {
        return assignments.findByIdAndInstructorId(assignmentId, instructorId)
                .orElseThrow(() -> notFound("ASSIGNMENT_NOT_FOUND", "Không tìm thấy bài tập của bạn"));
    }

    private void requireRole(UUID userId, RoleName roleName) {
        User user = users.findById(userId).orElseThrow(() -> notFound("USER_NOT_FOUND", "Không tìm thấy tài khoản"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ACCOUNT_NOT_ACTIVE", "Tài khoản chưa được kích hoạt");
        }
        if (user.getRoles().stream().noneMatch(role -> role.getName() == roleName)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ROLE_REQUIRED", "Bạn không có quyền thực hiện thao tác này");
        }
    }

    private void validateDueAt(Instant dueAt) {
        if (dueAt != null && dueAt.isBefore(Instant.now())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_ASSIGNMENT_DEADLINE", "Hạn nộp phải ở thời điểm hiện tại hoặc trong tương lai");
        }
    }

    private AssignmentResponse toAssignmentResponse(Assignment item, Course course, AssignmentSubmission submission) {
        return new AssignmentResponse(item.getId(), item.getCourseId(), course.getTitle(), item.getTitle(), item.getDescription(),
                item.getDueAt(), item.getMaxScore(), item.getStatus(), item.getPublishedAt(),
                submission == null ? null : submission.getSubmittedAt(),
                submission == null ? null : submission.getResponseText(),
                submission == null ? null : submission.getScore(),
                submission == null ? null : submission.getFeedback(),
                submission == null ? null : submission.getGradedAt());
    }

    private SubmissionResponse toSubmissionResponse(AssignmentSubmission item, User student) {
        return new SubmissionResponse(item.getId(), item.getAssignmentId(), item.getStudentId(),
                student == null ? null : student.getFullName(), student == null ? null : student.getEmail(),
                item.getResponseText(), item.getSubmittedAt(), item.getScore(), item.getFeedback(), item.getGradedAt());
    }

    private BusinessException notFound(String code, String message) {
        return new BusinessException(HttpStatus.NOT_FOUND, code, message);
    }

    private BusinessException conflict(String code, String message) {
        return new BusinessException(HttpStatus.CONFLICT, code, message);
    }
}
