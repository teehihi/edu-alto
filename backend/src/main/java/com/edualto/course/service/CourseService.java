package com.edualto.course.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.common.util.SlugUtils;
import com.edualto.course.domain.Course;
import com.edualto.course.domain.CourseLevel;
import com.edualto.course.domain.CourseStatus;
import com.edualto.course.dto.CourseDetailResponse;
import com.edualto.course.dto.CourseInstructorSummaryResponse;
import com.edualto.course.dto.CourseListItemResponse;
import com.edualto.course.dto.CourseThumbnailUploadUrlRequest;
import com.edualto.course.dto.CourseThumbnailUploadUrlResponse;
import com.edualto.course.dto.CreateCourseRequest;
import com.edualto.course.dto.InstructorCourseResponse;
import com.edualto.course.dto.UpdateCourseRequest;
import com.edualto.course.repository.CourseRepository;
import com.edualto.course.repository.CourseSpecification;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CourseService {

    private static final Logger log = LoggerFactory.getLogger(CourseService.class);

    private static final Set<String> ALLOWED_THUMBNAIL_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final long MAX_THUMBNAIL_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final Duration THUMBNAIL_UPLOAD_EXPIRATION = Duration.ofMinutes(15);

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final StorageService storageService;

    public CourseService(
            CourseRepository courseRepository,
            UserRepository userRepository,
            ProfileRepository profileRepository,
            StorageService storageService
    ) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.storageService = storageService;
    }

    // ==========================================
    // Public Catalog Methods
    // ==========================================

    @Transactional(readOnly = true)
    public Page<CourseListItemResponse> getPublicCatalog(
            String keyword,
            CourseLevel level,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Boolean isFree,
            String language,
            UUID instructorId,
            String sortBy,
            int page,
            int size
    ) {
        Sort sort = resolveCatalogSort(sortBy);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), sort);

        Specification<Course> spec = CourseSpecification.buildPublicCatalogSpec(
                keyword,
                level,
                minPrice,
                maxPrice,
                isFree,
                language,
                instructorId
        );

        Page<Course> coursesPage = courseRepository.findAll(spec, pageable);
        if (coursesPage.isEmpty()) {
            return coursesPage.map(c -> null); // Empty page
        }

        Set<UUID> instructorIds = coursesPage.getContent().stream()
                .map(Course::getInstructorId)
                .collect(Collectors.toSet());

        Map<UUID, CourseInstructorSummaryResponse> instructorMap = resolveInstructorSummaries(instructorIds);

        return coursesPage.map(course -> {
            String thumbnailUrl = resolveThumbnailUrl(course.getThumbnailKey());
            CourseInstructorSummaryResponse instructor = instructorMap.get(course.getInstructorId());
            return new CourseListItemResponse(
                    course.getId(),
                    course.getTitle(),
                    course.getSlug(),
                    course.getTagline(),
                    thumbnailUrl,
                    course.getPrice(),
                    course.getOriginalPrice(),
                    course.getLevel(),
                    course.getLanguage(),
                    course.getStatus(),
                    course.getPublishedAt(),
                    instructor
            );
        });
    }

    @Transactional(readOnly = true)
    public CourseDetailResponse getPublicCourseBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học");
        }

        Course course = courseRepository.findBySlugAndStatus(slug.trim(), CourseStatus.PUBLISHED)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));

        Map<UUID, CourseInstructorSummaryResponse> instructorMap = resolveInstructorSummaries(Set.of(course.getInstructorId()));
        CourseInstructorSummaryResponse instructor = instructorMap.get(course.getInstructorId());
        String thumbnailUrl = resolveThumbnailUrl(course.getThumbnailKey());

        return new CourseDetailResponse(
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                course.getTagline(),
                course.getDescription(),
                thumbnailUrl,
                course.getPrice(),
                course.getOriginalPrice(),
                course.getLevel(),
                course.getLanguage(),
                course.getStatus(),
                course.getPublishedAt(),
                course.getCreatedAt(),
                course.getUpdatedAt(),
                instructor
        );
    }

    // ==========================================
    // Instructor Management Methods
    // ==========================================

    @Transactional
    public InstructorCourseResponse createCourse(UUID instructorId, CreateCourseRequest request) {
        validateInstructor(instructorId);
        validateCoursePrices(request.price(), request.originalPrice());

        String slug = resolveUniqueSlug(request.slug(), request.title(), null);

        Course course = new Course(
                UUID.randomUUID(),
                instructorId,
                request.title().trim(),
                slug,
                request.tagline() != null ? request.tagline().trim() : null,
                request.description().trim(),
                request.price() != null ? request.price() : BigDecimal.ZERO,
                request.originalPrice(),
                request.level() != null ? request.level() : CourseLevel.ALL_LEVELS,
                request.language() != null && !request.language().isBlank() ? request.language().trim() : "vi",
                request.thumbnailKey() != null ? request.thumbnailKey().trim() : null
        );

        course = courseRepository.save(course);
        return toInstructorCourseResponse(course);
    }

    @Transactional(readOnly = true)
    public Page<InstructorCourseResponse> getInstructorCourses(
            UUID instructorId,
            CourseStatus status,
            int page,
            int size
    ) {
        validateInstructor(instructorId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Course> coursesPage = (status != null)
                ? courseRepository.findAllByInstructorIdAndStatus(instructorId, status, pageable)
                : courseRepository.findAllByInstructorId(instructorId, pageable);

        return coursesPage.map(this::toInstructorCourseResponse);
    }

    @Transactional(readOnly = true)
    public InstructorCourseResponse getInstructorCourseById(UUID instructorId, UUID courseId) {
        Course course = getCourseAndCheckOwnership(instructorId, courseId);
        return toInstructorCourseResponse(course);
    }

    @Transactional
    public InstructorCourseResponse updateCourse(UUID instructorId, UUID courseId, UpdateCourseRequest request) {
        Course course = getCourseAndCheckOwnership(instructorId, courseId);
        validateCoursePrices(request.price(), request.originalPrice());

        String targetSlug = course.getSlug();
        if (request.slug() != null && !request.slug().isBlank()) {
            String candidateSlug = SlugUtils.toSlug(request.slug());
            if (candidateSlug.isBlank()) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SLUG", "Đường dẫn khóa học không hợp lệ");
            }
            if (courseRepository.existsBySlugAndIdNot(candidateSlug, courseId)) {
                throw new BusinessException(HttpStatus.CONFLICT, "DUPLICATE_SLUG", "Đường dẫn khóa học (slug) đã tồn tại");
            }
            targetSlug = candidateSlug;
        } else if (!course.getTitle().equalsIgnoreCase(request.title().trim()) && (request.slug() == null)) {
            // Title changed and no explicit slug provided: regenerate slug if course is still DRAFT
            if (course.getStatus() == CourseStatus.DRAFT) {
                targetSlug = resolveUniqueSlug(null, request.title(), courseId);
            }
        }

        course.update(
                request.title().trim(),
                targetSlug,
                request.tagline() != null ? request.tagline().trim() : null,
                request.description().trim(),
                request.price() != null ? request.price() : BigDecimal.ZERO,
                request.originalPrice(),
                request.level() != null ? request.level() : CourseLevel.ALL_LEVELS,
                request.language() != null && !request.language().isBlank() ? request.language().trim() : "vi",
                request.thumbnailKey() != null ? request.thumbnailKey().trim() : null
        );

        course = courseRepository.save(course);
        return toInstructorCourseResponse(course);
    }

    @Transactional
    public InstructorCourseResponse publishCourse(UUID instructorId, UUID courseId) {
        Course course = getCourseAndCheckOwnership(instructorId, courseId);

        if (course.getTitle() == null || course.getTitle().isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COURSE_DATA", "Khóa học phải có tiêu đề trước khi xuất bản");
        }
        if (course.getDescription() == null || course.getDescription().isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COURSE_DATA", "Khóa học phải có mô tả trước khi xuất bản");
        }
        if (course.getPrice() == null || course.getPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COURSE_PRICE", "Giá khóa học không hợp lệ");
        }

        course.publish();
        course = courseRepository.save(course);
        return toInstructorCourseResponse(course);
    }

    @Transactional
    public InstructorCourseResponse archiveCourse(UUID instructorId, UUID courseId) {
        Course course = getCourseAndCheckOwnership(instructorId, courseId);
        course.archive();
        course = courseRepository.save(course);
        return toInstructorCourseResponse(course);
    }

    @Transactional(readOnly = true)
    public CourseThumbnailUploadUrlResponse generateThumbnailUploadUrl(UUID instructorId, CourseThumbnailUploadUrlRequest request) {
        validateInstructor(instructorId);

        String contentType = request.contentType() != null ? request.contentType().trim().toLowerCase() : "";
        if (!ALLOWED_THUMBNAIL_CONTENT_TYPES.contains(contentType)) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_CONTENT_TYPE",
                    "Định dạng hình ảnh không được hỗ trợ. Vui lòng chọn JPEG, PNG hoặc WebP."
            );
        }

        if (request.contentLength() == null || request.contentLength() <= 0 || request.contentLength() > MAX_THUMBNAIL_SIZE_BYTES) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_FILE_SIZE",
                    "Kích thước ảnh bìa khóa học không hợp lệ hoặc vượt quá 5MB."
            );
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "webp";
        };

        String objectKey = "courses/thumbnails/" + instructorId + "/" + UUID.randomUUID() + "." + extension;
        PresignedUploadUrl presigned = storageService.generatePresignedUploadUrl(
                objectKey,
                contentType,
                request.contentLength(),
                THUMBNAIL_UPLOAD_EXPIRATION
        );

        return new CourseThumbnailUploadUrlResponse(
                presigned.uploadUrl(),
                objectKey,
                presigned.expiresAt()
        );
    }

    // ==========================================
    // Internal Helper Methods
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
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "COURSE_NOT_FOUND", "Không tìm thấy khóa học"));

        if (!course.getInstructorId().equals(instructorId)) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "UNAUTHORIZED_COURSE_ACCESS", "Bạn không có quyền thao tác trên khóa học này");
        }
        return course;
    }

    private void validateCoursePrices(BigDecimal price, BigDecimal originalPrice) {
        if (price != null && price.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COURSE_PRICE", "Giá khóa học không được nhỏ hơn 0");
        }
        if (originalPrice != null) {
            if (originalPrice.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COURSE_PRICE", "Giá gốc khóa học không được nhỏ hơn 0");
            }
            if (price != null && originalPrice.compareTo(price) < 0) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_COURSE_PRICE", "Giá gốc phải lớn hơn hoặc bằng giá bán");
            }
        }
    }

    private String resolveUniqueSlug(String explicitSlug, String title, UUID currentCourseId) {
        if (explicitSlug != null && !explicitSlug.isBlank()) {
            String slug = SlugUtils.toSlug(explicitSlug);
            if (slug.isBlank()) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_SLUG", "Đường dẫn khóa học không hợp lệ");
            }
            boolean exists = (currentCourseId != null)
                    ? courseRepository.existsBySlugAndIdNot(slug, currentCourseId)
                    : courseRepository.existsBySlug(slug);
            if (exists) {
                throw new BusinessException(HttpStatus.CONFLICT, "DUPLICATE_SLUG", "Đường dẫn khóa học (slug) đã tồn tại");
            }
            return slug;
        }

        String baseSlug = SlugUtils.toSlug(title);
        if (baseSlug.isBlank()) {
            baseSlug = "khoa-hoc-" + UUID.randomUUID().toString().substring(0, 8);
        }

        String candidateSlug = baseSlug;
        int counter = 1;
        while (true) {
            boolean exists = (currentCourseId != null)
                    ? courseRepository.existsBySlugAndIdNot(candidateSlug, currentCourseId)
                    : courseRepository.existsBySlug(candidateSlug);
            if (!exists) {
                return candidateSlug;
            }
            candidateSlug = baseSlug + "-" + counter;
            counter++;
        }
    }

    private Sort resolveCatalogSort(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "publishedAt");
        }
        return switch (sortBy.toLowerCase()) {
            case "price_asc", "priceasc" -> Sort.by(Sort.Direction.ASC, "price");
            case "price_desc", "pricedesc" -> Sort.by(Sort.Direction.DESC, "price");
            case "title_asc", "titleasc" -> Sort.by(Sort.Direction.ASC, "title");
            case "oldest" -> Sort.by(Sort.Direction.ASC, "publishedAt");
            default -> Sort.by(Sort.Direction.DESC, "publishedAt");
        };
    }

    private Map<UUID, CourseInstructorSummaryResponse> resolveInstructorSummaries(Set<UUID> instructorIds) {
        if (instructorIds == null || instructorIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<UUID, User> users = userRepository.findAllById(instructorIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        Map<UUID, Profile> profiles = profileRepository.findAllById(instructorIds).stream()
                .collect(Collectors.toMap(Profile::getUserId, Function.identity()));

        return instructorIds.stream().collect(Collectors.toMap(
                Function.identity(),
                id -> {
                    User user = users.get(id);
                    Profile profile = profiles.get(id);
                    String fullName = user != null ? user.getFullName() : "Giảng viên EduAlto";
                    String avatarUrl = (profile != null && profile.getAvatarKey() != null)
                            ? storageService.getPublicUrl(profile.getAvatarKey())
                            : null;
                    String headline = profile != null ? profile.getHeadline() : null;
                    String customHandle = profile != null ? profile.getCustomHandle() : null;
                    return new CourseInstructorSummaryResponse(id, fullName, avatarUrl, headline, customHandle);
                }
        ));
    }

    private String resolveThumbnailUrl(String thumbnailKey) {
        if (thumbnailKey == null || thumbnailKey.isBlank()) {
            return null;
        }
        return storageService.getPublicUrl(thumbnailKey);
    }

    private InstructorCourseResponse toInstructorCourseResponse(Course course) {
        String thumbnailUrl = resolveThumbnailUrl(course.getThumbnailKey());
        return new InstructorCourseResponse(
                course.getId(),
                course.getTitle(),
                course.getSlug(),
                course.getTagline(),
                course.getDescription(),
                course.getThumbnailKey(),
                thumbnailUrl,
                course.getPrice(),
                course.getOriginalPrice(),
                course.getLevel(),
                course.getLanguage(),
                course.getStatus(),
                course.getCreatedAt(),
                course.getUpdatedAt(),
                course.getPublishedAt()
        );
    }
}
