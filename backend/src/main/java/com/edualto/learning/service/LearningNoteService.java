package com.edualto.learning.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.LessonType;
import com.edualto.course.dto.LearningLessonResponse;
import com.edualto.course.service.CourseLearningAccessService;
import com.edualto.enrollment.service.EnrollmentService;
import com.edualto.learning.domain.LearningNote;
import com.edualto.learning.dto.LearningNoteRequest;
import com.edualto.learning.dto.LearningNoteResponse;
import com.edualto.learning.repository.LearningNoteRepository;
import com.edualto.user.service.UserService;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningNoteService {
    private final LearningNoteRepository notes;
    private final UserService users;
    private final CourseLearningAccessService courses;
    private final EnrollmentService enrollments;

    public LearningNoteService(
            LearningNoteRepository notes,
            UserService users,
            CourseLearningAccessService courses,
            EnrollmentService enrollments
    ) {
        this.notes = notes;
        this.users = users;
        this.courses = courses;
        this.enrollments = enrollments;
    }

    @Transactional(readOnly = true)
    public Page<LearningNoteResponse> list(UUID userId, int page, int size) {
        users.requireActiveStudent(userId);
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang ghi chú không hợp lệ");
        }
        return notes.findAllByUserId(userId, PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "updatedAt").and(Sort.by(Sort.Direction.ASC, "id"))))
                .map(LearningNoteResponse::from);
    }

    @Transactional
    public LearningNoteResponse create(UUID userId, LearningNoteRequest request) {
        users.requireActiveStudent(userId);
        validateLessonAccess(userId, request.lessonId(), request.videoSecond());
        LearningNote note = new LearningNote(UUID.randomUUID(), userId, request.lessonId(), request.title(),
                request.content(), request.videoSecond());
        return LearningNoteResponse.from(notes.save(note));
    }

    @Transactional
    public LearningNoteResponse update(UUID userId, UUID noteId, LearningNoteRequest request) {
        users.requireActiveStudent(userId);
        LearningNote note = requireOwnedNote(userId, noteId);
        validateLessonAccess(userId, request.lessonId(), request.videoSecond());
        note.update(request.title(), request.content(), request.lessonId(), request.videoSecond());
        return LearningNoteResponse.from(note);
    }

    @Transactional
    public void delete(UUID userId, UUID noteId) {
        LearningNote note = requireOwnedNote(userId, noteId);
        notes.delete(note);
    }

    private LearningNote requireOwnedNote(UUID userId, UUID noteId) {
        return notes.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOTE_NOT_FOUND", "Không tìm thấy ghi chú"));
    }

    private void validateLessonAccess(UUID userId, UUID lessonId, Integer videoSecond) {
        if (lessonId == null) {
            if (videoSecond != null) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "NOTE_VIDEO_POSITION_REQUIRES_LESSON", "Vị trí video cần gắn với bài học video");
            }
            return;
        }
        LearningLessonResponse lesson = courses.requirePublishedLesson(lessonId);
        enrollments.requireEnrollment(userId, lesson.courseId());
        if (videoSecond != null && lesson.lessonType() != LessonType.VIDEO) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "NOTE_VIDEO_POSITION_REQUIRES_VIDEO", "Chỉ có thể gắn vị trí với bài học video");
        }
    }
}
