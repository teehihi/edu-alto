package com.edualto.discussion.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.LearningLessonResponse;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.service.CourseLearningAccessService;
import com.edualto.discussion.domain.Discussion;
import com.edualto.discussion.domain.DiscussionComment;
import com.edualto.discussion.domain.DiscussionStatus;
import com.edualto.discussion.dto.CreateDiscussionCommentRequest;
import com.edualto.discussion.dto.CreateDiscussionRequest;
import com.edualto.discussion.dto.DiscussionCommentResponse;
import com.edualto.discussion.dto.DiscussionDetailResponse;
import com.edualto.discussion.dto.DiscussionResponse;
import com.edualto.discussion.repository.DiscussionCommentCountProjection;
import com.edualto.discussion.repository.DiscussionCommentRepository;
import com.edualto.discussion.repository.DiscussionRepository;
import com.edualto.enrollment.domain.EnrollmentStatus;
import com.edualto.enrollment.repository.EnrollmentRepository;
import com.edualto.notification.domain.NotificationType;
import com.edualto.notification.service.RealtimeNotificationService;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiscussionService {

    private final DiscussionRepository discussions;
    private final DiscussionCommentRepository comments;
    private final CourseLearningAccessService courseAccess;
    private final CourseRepository courses;
    private final EnrollmentRepository enrollments;
    private final UserRepository users;
    private final ProfileRepository profiles;
    private final StorageService storage;
    private final RealtimeNotificationService realtimeNotifications;

    public DiscussionService(
            DiscussionRepository discussions,
            DiscussionCommentRepository comments,
            CourseLearningAccessService courseAccess,
            CourseRepository courses,
            EnrollmentRepository enrollments,
            UserRepository users,
            ProfileRepository profiles,
            StorageService storage,
            RealtimeNotificationService realtimeNotifications
    ) {
        this.discussions = discussions;
        this.comments = comments;
        this.courseAccess = courseAccess;
        this.courses = courses;
        this.enrollments = enrollments;
        this.users = users;
        this.profiles = profiles;
        this.storage = storage;
        this.realtimeNotifications = realtimeNotifications;
    }

    @Transactional(readOnly = true)
    public Page<DiscussionResponse> listLessonDiscussions(
            UUID currentUserId,
            UUID lessonId,
            int page,
            int size,
            String sort,
            String search,
            Boolean hasTimestamp
    ) {
        LearningLessonResponse lesson = courseAccess.requirePublishedLesson(lessonId);
        Course course = requireCourse(lesson.courseId());
        User currentUser = requireActiveUser(currentUserId);
        requireCourseAccess(currentUser, course);

        validatePagination(page, size);
        boolean onlyWithTimestamp = Boolean.TRUE.equals(hasTimestamp);
        String normalizedQuery = search != null && !search.isBlank() ? search.trim() : null;
        String normalizedSort = sort != null ? sort.trim().toLowerCase(Locale.ROOT) : "latest";

        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Discussion> pageResult = discussions.searchLessonDiscussions(
                lessonId,
                onlyWithTimestamp,
                normalizedQuery,
                normalizedSort,
                pageRequest
        );

        List<DiscussionResponse> responses = mapDiscussionsToResponses(
                pageResult.getContent(),
                course,
                currentUser
        );
        return new PageImpl<>(responses, pageRequest, pageResult.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<DiscussionResponse> listCourseDiscussions(
            UUID currentUserId,
            UUID courseId,
            int page,
            int size
    ) {
        Course course = requireCourse(courseId);
        User currentUser = requireActiveUser(currentUserId);
        requireCourseAccess(currentUser, course);
        validatePagination(page, size);

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Discussion> pageResult = discussions.findByCourseIdAndDeletedAtIsNull(courseId, pageRequest);

        List<DiscussionResponse> responses = mapDiscussionsToResponses(
                pageResult.getContent(),
                course,
                currentUser
        );
        return new PageImpl<>(responses, pageRequest, pageResult.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DiscussionDetailResponse getDiscussion(UUID currentUserId, UUID discussionId) {
        Discussion discussion = requireDiscussion(discussionId);
        Course course = requireCourse(discussion.getCourseId());
        User currentUser = requireActiveUser(currentUserId);
        requireCourseAccess(currentUser, course);

        List<DiscussionComment> commentList = comments.findByDiscussionIdAndDeletedAtIsNullOrderByCreatedAtAsc(discussionId);

        Set<UUID> userIds = commentList.stream()
                .map(DiscussionComment::getAuthorId)
                .collect(Collectors.toSet());
        userIds.add(discussion.getAuthorId());

        Map<UUID, User> userMap = users.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<UUID, String> avatarMap = resolveAvatarUrls(userIds);

        boolean isCurrentUserAdmin = isAdmin(currentUser);
        boolean isCurrentUserCourseInstructor = course.getInstructorId().equals(currentUser.getId());

        User author = userMap.get(discussion.getAuthorId());
        String authorName = author != null ? author.getFullName() : "Học viên EduAlto";
        boolean isDiscussionAuthorInstructor = course.getInstructorId().equals(discussion.getAuthorId());
        String authorRole = resolveRole(author, isDiscussionAuthorInstructor);
        boolean canDeleteDiscussion = isCurrentUserAdmin
                || isCurrentUserCourseInstructor
                || discussion.getAuthorId().equals(currentUserId);

        List<DiscussionCommentResponse> commentResponses = commentList.stream()
                .map(comment -> {
                    User commentAuthor = userMap.get(comment.getAuthorId());
                    String commentAuthorName = commentAuthor != null ? commentAuthor.getFullName() : "Người dùng";
                    boolean isCommentAuthorInstructor = course.getInstructorId().equals(comment.getAuthorId());
                    String commentAuthorRole = resolveRole(commentAuthor, isCommentAuthorInstructor);
                    boolean canDeleteComment = isCurrentUserAdmin
                            || isCurrentUserCourseInstructor
                            || comment.getAuthorId().equals(currentUserId);

                    return new DiscussionCommentResponse(
                            comment.getId(),
                            comment.getDiscussionId(),
                            comment.getAuthorId(),
                            commentAuthorName,
                            avatarMap.get(comment.getAuthorId()),
                            commentAuthorRole,
                            isCommentAuthorInstructor,
                            comment.getBody(),
                            comment.getParentCommentId(),
                            comment.getCreatedAt(),
                            canDeleteComment
                    );
                })
                .toList();

        return new DiscussionDetailResponse(
                discussion.getId(),
                discussion.getCourseId(),
                discussion.getLessonId(),
                discussion.getAuthorId(),
                authorName,
                avatarMap.get(discussion.getAuthorId()),
                authorRole,
                isDiscussionAuthorInstructor,
                discussion.getTitle(),
                discussion.getBody(),
                discussion.getVideoTimestampSeconds(),
                discussion.getStatus(),
                commentList.size(),
                discussion.getCreatedAt(),
                discussion.getUpdatedAt(),
                canDeleteDiscussion,
                commentResponses
        );
    }

    @Transactional
    public DiscussionResponse createDiscussion(
            UUID currentUserId,
            UUID lessonId,
            CreateDiscussionRequest request
    ) {
        LearningLessonResponse lesson = courseAccess.requirePublishedLesson(lessonId);
        Course course = requireCourse(lesson.courseId());
        User currentUser = requireActiveUser(currentUserId);
        requireCourseAccess(currentUser, course);

        Integer timestamp = request.videoTimestampSeconds();
        if (timestamp != null && timestamp < 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_TIMESTAMP", "Mốc thời gian video không hợp lệ");
        }

        Discussion discussion = new Discussion(
                UUID.randomUUID(),
                course.getId(),
                lesson.id(),
                currentUser.getId(),
                request.title().trim(),
                request.body().trim(),
                timestamp
        );
        Discussion saved = discussions.save(discussion);

        String avatarUrl = getAvatarUrl(currentUser.getId());
        boolean isInstructor = course.getInstructorId().equals(currentUser.getId());
        String role = resolveRole(currentUser, isInstructor);

        return new DiscussionResponse(
                saved.getId(),
                saved.getCourseId(),
                saved.getLessonId(),
                saved.getAuthorId(),
                currentUser.getFullName(),
                avatarUrl,
                role,
                isInstructor,
                saved.getTitle(),
                saved.getBody(),
                saved.getVideoTimestampSeconds(),
                saved.getStatus(),
                0,
                saved.getCreatedAt(),
                saved.getUpdatedAt(),
                true
        );
    }

    @Transactional
    public DiscussionCommentResponse addComment(
            UUID currentUserId,
            UUID discussionId,
            CreateDiscussionCommentRequest request
    ) {
        Discussion discussion = requireDiscussion(discussionId);
        Course course = requireCourse(discussion.getCourseId());
        User currentUser = requireActiveUser(currentUserId);
        requireCourseAccess(currentUser, course);

        if (request.parentCommentId() != null) {
            DiscussionComment parent = comments.findByIdAndDeletedAtIsNull(request.parentCommentId())
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "PARENT_COMMENT_NOT_FOUND", "Không tìm thấy bình luận gốc"));
            if (!parent.getDiscussionId().equals(discussionId)) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PARENT_COMMENT", "Bình luận gốc không thuộc thảo luận này");
            }
        }

        DiscussionComment comment = new DiscussionComment(
                UUID.randomUUID(),
                discussionId,
                currentUser.getId(),
                request.parentCommentId(),
                request.body().trim()
        );
        DiscussionComment saved = comments.save(comment);

        String avatarUrl = getAvatarUrl(currentUser.getId());
        boolean isInstructor = course.getInstructorId().equals(currentUser.getId());
        String role = resolveRole(currentUser, isInstructor);

        if (!discussion.getAuthorId().equals(currentUser.getId())) {
            String title = isInstructor ? "Giảng viên đã giải đáp câu hỏi của bạn" : "Có phản hồi mới cho câu hỏi của bạn";
            String notifMsg = currentUser.getFullName() + (isInstructor ? " (Giảng viên)" : "") + " vừa trả lời thắc mắc của bạn: \"" + discussion.getTitle() + "\"";
            String linkUrl = "/learning/lessons/" + discussion.getLessonId() + "?courseId=" + discussion.getCourseId();
            realtimeNotifications.sendNotification(
                    discussion.getAuthorId(),
                    NotificationType.DISCUSSION_REPLY,
                    title,
                    notifMsg,
                    linkUrl
            );
        }

        return new DiscussionCommentResponse(
                saved.getId(),
                saved.getDiscussionId(),
                saved.getAuthorId(),
                currentUser.getFullName(),
                avatarUrl,
                role,
                isInstructor,
                saved.getBody(),
                saved.getParentCommentId(),
                saved.getCreatedAt(),
                true
        );
    }

    @Transactional
    public void deleteDiscussion(UUID currentUserId, UUID discussionId) {
        Discussion discussion = requireDiscussion(discussionId);
        Course course = requireCourse(discussion.getCourseId());
        User currentUser = requireActiveUser(currentUserId);

        boolean isAllowed = isAdmin(currentUser)
                || course.getInstructorId().equals(currentUser.getId())
                || discussion.getAuthorId().equals(currentUser.getId());

        if (!isAllowed) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền xóa câu hỏi này");
        }

        discussion.markDeleted();
        discussions.save(discussion);
    }

    @Transactional
    public void deleteComment(UUID currentUserId, UUID discussionId, UUID commentId) {
        Discussion discussion = requireDiscussion(discussionId);
        DiscussionComment comment = comments.findByIdAndDeletedAtIsNull(commentId)
                .filter(item -> item.getDiscussionId().equals(discussionId))
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "Không tìm thấy phản hồi"));
        Course course = requireCourse(discussion.getCourseId());
        User currentUser = requireActiveUser(currentUserId);

        boolean isAllowed = isAdmin(currentUser)
                || course.getInstructorId().equals(currentUser.getId())
                || comment.getAuthorId().equals(currentUser.getId());

        if (!isAllowed) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền xóa phản hồi này");
        }

        comment.markDeleted();
        comments.save(comment);
    }

    @Transactional
    public DiscussionResponse updateStatus(
            UUID currentUserId,
            UUID discussionId,
            DiscussionStatus newStatus
    ) {
        Discussion discussion = requireDiscussion(discussionId);
        Course course = requireCourse(discussion.getCourseId());
        User currentUser = requireActiveUser(currentUserId);

        boolean isAllowed = isAdmin(currentUser)
                || course.getInstructorId().equals(currentUser.getId())
                || discussion.getAuthorId().equals(currentUser.getId());

        if (!isAllowed) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Bạn không có quyền thay đổi trạng thái câu hỏi");
        }

        discussion.setStatus(newStatus);
        Discussion saved = discussions.save(discussion);

        User author = users.findById(saved.getAuthorId()).orElse(null);
        String authorName = author != null ? author.getFullName() : "Học viên EduAlto";
        String avatarUrl = getAvatarUrl(saved.getAuthorId());
        boolean isInstructor = course.getInstructorId().equals(saved.getAuthorId());
        String role = resolveRole(author, isInstructor);
        long commentCount = comments.countByDiscussionIdAndDeletedAtIsNull(saved.getId());

        return new DiscussionResponse(
                saved.getId(),
                saved.getCourseId(),
                saved.getLessonId(),
                saved.getAuthorId(),
                authorName,
                avatarUrl,
                role,
                isInstructor,
                saved.getTitle(),
                saved.getBody(),
                saved.getVideoTimestampSeconds(),
                saved.getStatus(),
                commentCount,
                saved.getCreatedAt(),
                saved.getUpdatedAt(),
                true
        );
    }

    private List<DiscussionResponse> mapDiscussionsToResponses(
            List<Discussion> discussionList,
            Course course,
            User currentUser
    ) {
        if (discussionList.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> authorIds = discussionList.stream()
                .map(Discussion::getAuthorId)
                .collect(Collectors.toSet());
        Map<UUID, User> authorMap = users.findAllById(authorIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<UUID, String> avatarMap = resolveAvatarUrls(authorIds);

        List<UUID> discussionIds = discussionList.stream().map(Discussion::getId).toList();
        Map<UUID, Long> commentCountMap = comments.countByDiscussionIdIn(discussionIds).stream()
                .collect(Collectors.toMap(
                        DiscussionCommentCountProjection::getDiscussionId,
                        DiscussionCommentCountProjection::getCount
                ));

        boolean isCurrentUserAdmin = isAdmin(currentUser);
        boolean isCurrentUserCourseInstructor = course.getInstructorId().equals(currentUser.getId());

        return discussionList.stream()
                .map(discussion -> {
                    User author = authorMap.get(discussion.getAuthorId());
                    String authorName = author != null ? author.getFullName() : "Học viên EduAlto";
                    boolean isDiscussionAuthorInstructor = course.getInstructorId().equals(discussion.getAuthorId());
                    String authorRole = resolveRole(author, isDiscussionAuthorInstructor);
                    boolean canDelete = isCurrentUserAdmin
                            || isCurrentUserCourseInstructor
                            || discussion.getAuthorId().equals(currentUser.getId());
                    long commentCount = commentCountMap.getOrDefault(discussion.getId(), 0L);

                    return new DiscussionResponse(
                            discussion.getId(),
                            discussion.getCourseId(),
                            discussion.getLessonId(),
                            discussion.getAuthorId(),
                            authorName,
                            avatarMap.get(discussion.getAuthorId()),
                            authorRole,
                            isDiscussionAuthorInstructor,
                            discussion.getTitle(),
                            discussion.getBody(),
                            discussion.getVideoTimestampSeconds(),
                            discussion.getStatus(),
                            commentCount,
                            discussion.getCreatedAt(),
                            discussion.getUpdatedAt(),
                            canDelete
                    );
                })
                .toList();
    }

    private Discussion requireDiscussion(UUID discussionId) {
        return discussions.findByIdAndDeletedAtIsNull(discussionId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "DISCUSSION_NOT_FOUND", "Không tìm thấy câu hỏi thảo luận"));
    }

    private Course requireCourse(UUID courseId) {
        return courses.findById(courseId)
                .filter(course -> course.getStatus() == CourseStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));
    }

    private User requireActiveUser(UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND", "Người dùng không tồn tại"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "USER_INACTIVE", "Tài khoản của bạn hiện không hoạt động");
        }
        return user;
    }

    private void requireCourseAccess(User user, Course course) {
        if (isAdmin(user) || course.getInstructorId().equals(user.getId())) {
            return;
        }
        boolean hasActiveEnrollment = enrollments.findByStudentIdAndCourseId(user.getId(), course.getId())
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE)
                .isPresent();
        if (!hasActiveEnrollment) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "ENROLLMENT_REQUIRED", "Bạn cần ghi danh khóa học để tham gia thảo luận");
        }
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.ADMIN);
    }

    private String resolveRole(User user, boolean isCourseInstructor) {
        if (isCourseInstructor) {
            return "INSTRUCTOR";
        }
        if (user != null && isAdmin(user)) {
            return "ADMIN";
        }
        return "STUDENT";
    }

    private Map<UUID, String> resolveAvatarUrls(Collection<UUID> userIds) {
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return profiles.findAllById(userIds).stream()
                .filter(profile -> profile.getAvatarKey() != null && !profile.getAvatarKey().isBlank())
                .collect(Collectors.toMap(
                        Profile::getUserId,
                        profile -> storage.getPublicUrl(profile.getAvatarKey())
                ));
    }

    private String getAvatarUrl(UUID userId) {
        return profiles.findById(userId)
                .map(Profile::getAvatarKey)
                .filter(avatarKey -> !avatarKey.isBlank())
                .map(storage::getPublicUrl)
                .orElse(null);
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PAGINATION", "Phân trang không hợp lệ; kích thước từ 1 đến 100");
        }
    }
}
