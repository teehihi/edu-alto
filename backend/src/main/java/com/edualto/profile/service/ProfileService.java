package com.edualto.profile.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.profile.domain.InstructorProfile;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.domain.StudentProfile;
import com.edualto.profile.dto.AvatarCompleteRequest;
import com.edualto.profile.dto.AvatarUploadUrlRequest;
import com.edualto.profile.dto.AvatarUploadUrlResponse;
import com.edualto.profile.dto.UpdateProfileRequest;
import com.edualto.profile.dto.UserProfileResponse;
import com.edualto.profile.repository.InstructorProfileRepository;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.profile.repository.StudentProfileRepository;
import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.service.StorageService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.repository.UserRepository;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private static final Logger log = LoggerFactory.getLogger(ProfileService.class);

    private static final Set<String> ALLOWED_AVATAR_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final long MAX_AVATAR_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final Duration AVATAR_UPLOAD_EXPIRATION = Duration.ofMinutes(15);

    private final ProfileRepository profileRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final InstructorProfileRepository instructorProfileRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;

    public ProfileService(
            ProfileRepository profileRepository,
            StudentProfileRepository studentProfileRepository,
            InstructorProfileRepository instructorProfileRepository,
            UserRepository userRepository,
            StorageService storageService
    ) {
        this.profileRepository = profileRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.instructorProfileRepository = instructorProfileRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
    }

    @Transactional
    public void createStudentProfile(UUID userId, String learningGoal, String bio) {
        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> new Profile(userId));
        if (bio != null && !bio.isBlank()) {
            profile.setBio(bio.trim());
        }
        profileRepository.save(profile);

        StudentProfile studentProfile = studentProfileRepository.findById(userId)
                .orElseGet(() -> new StudentProfile(userId, learningGoal));
        if (learningGoal != null && !learningGoal.isBlank()) {
            studentProfile.setLearningGoal(learningGoal.trim());
        }
        studentProfileRepository.save(studentProfile);
    }

    @Transactional
    public void createInstructorProfile(UUID userId, String expertise, String bio) {
        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> new Profile(userId));
        if (bio != null && !bio.isBlank()) {
            profile.setBio(bio.trim());
        }
        profileRepository.save(profile);

        InstructorProfile instructorProfile = instructorProfileRepository.findById(userId)
                .orElseGet(() -> new InstructorProfile(userId, expertise.trim()));
        instructorProfileRepository.save(instructorProfile);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        Profile profile = profileRepository.findById(userId).orElse(null);
        StudentProfile studentProfile = studentProfileRepository.findById(userId).orElse(null);
        InstructorProfile instructorProfile = instructorProfileRepository.findById(userId).orElse(null);

        String avatarUrl = (profile != null && profile.getAvatarKey() != null)
                ? storageService.getPublicUrl(profile.getAvatarKey())
                : null;

        return UserProfileResponse.from(user, profile, studentProfile, instructorProfile, avatarUrl);
    }

    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.updateProfile(request.fullName().trim());
            userRepository.save(user);
        }

        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> new Profile(userId));
        profile.update(
                request.headline() != null ? request.headline().trim() : profile.getHeadline(),
                request.bio() != null ? request.bio().trim() : profile.getBio(),
                request.language() != null ? request.language().trim() : profile.getLanguage(),
                request.websiteUrl() != null ? request.websiteUrl().trim() : profile.getWebsiteUrl(),
                request.xUrl() != null ? request.xUrl().trim() : profile.getXUrl(),
                request.linkedinUrl() != null ? request.linkedinUrl().trim() : profile.getLinkedinUrl(),
                request.youtubeUrl() != null ? request.youtubeUrl().trim() : profile.getYoutubeUrl(),
                request.facebookUrl() != null ? request.facebookUrl().trim() : profile.getFacebookUrl()
        );
        profile = profileRepository.save(profile);

        boolean isStudent = user.getRoles().stream().anyMatch(r -> r.getName() == RoleName.STUDENT);
        boolean isInstructor = user.getRoles().stream().anyMatch(r -> r.getName() == RoleName.INSTRUCTOR);

        StudentProfile studentProfile = studentProfileRepository.findById(userId).orElse(null);
        if (isStudent || studentProfile != null || request.learningGoal() != null || request.occupation() != null || request.educationLevel() != null || request.interests() != null) {
            if (studentProfile == null) {
                studentProfile = new StudentProfile(userId);
            }
            studentProfile.update(
                    request.learningGoal() != null ? request.learningGoal().trim() : studentProfile.getLearningGoal(),
                    request.occupation() != null ? request.occupation().trim() : studentProfile.getOccupation(),
                    request.educationLevel() != null ? request.educationLevel().trim() : studentProfile.getEducationLevel(),
                    request.interests() != null ? request.interests().trim() : studentProfile.getInterests()
            );
            studentProfile = studentProfileRepository.save(studentProfile);
        }

        InstructorProfile instructorProfile = instructorProfileRepository.findById(userId).orElse(null);
        if (isInstructor || instructorProfile != null || request.expertise() != null || request.experienceYears() != null || request.teachingExperience() != null || request.qualificationSummary() != null || request.specialties() != null) {
            if (instructorProfile == null) {
                String exp = (request.expertise() != null && !request.expertise().isBlank()) ? request.expertise().trim() : "Chuyên gia";
                instructorProfile = new InstructorProfile(userId, exp);
            }
            instructorProfile.update(
                    request.expertise() != null ? request.expertise().trim() : instructorProfile.getExpertise(),
                    request.experienceYears() != null ? request.experienceYears() : instructorProfile.getExperienceYears(),
                    request.teachingExperience() != null ? request.teachingExperience().trim() : instructorProfile.getTeachingExperience(),
                    request.qualificationSummary() != null ? request.qualificationSummary().trim() : instructorProfile.getQualificationSummary(),
                    request.specialties() != null ? request.specialties().trim() : instructorProfile.getSpecialties()
            );
            instructorProfile = instructorProfileRepository.save(instructorProfile);
        }

        String avatarUrl = profile.getAvatarKey() != null
                ? storageService.getPublicUrl(profile.getAvatarKey())
                : null;

        return UserProfileResponse.from(user, profile, studentProfile, instructorProfile, avatarUrl);
    }

    @Transactional(readOnly = true)
    public AvatarUploadUrlResponse generateAvatarUploadUrl(UUID userId, AvatarUploadUrlRequest request) {
        if (!userRepository.existsById(userId)) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng");
        }

        String contentType = request.contentType() != null ? request.contentType().trim().toLowerCase() : "";
        if (!ALLOWED_AVATAR_CONTENT_TYPES.contains(contentType)) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_CONTENT_TYPE",
                    "Định dạng hình ảnh không được hỗ trợ. Vui lòng chọn JPEG, PNG hoặc WebP."
            );
        }

        if (request.contentLength() == null || request.contentLength() <= 0 || request.contentLength() > MAX_AVATAR_SIZE_BYTES) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_FILE_SIZE",
                    "Kích thước ảnh đại diện không hợp lệ hoặc vượt quá 5MB."
            );
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "webp";
        };

        String objectKey = "avatars/" + userId + "/" + UUID.randomUUID() + "." + extension;
        PresignedUploadUrl presigned = storageService.generatePresignedUploadUrl(
                objectKey,
                contentType,
                request.contentLength(),
                AVATAR_UPLOAD_EXPIRATION
        );

        return new AvatarUploadUrlResponse(
                presigned.uploadUrl(),
                objectKey,
                presigned.expiresAt()
        );
    }

    @Transactional
    public UserProfileResponse completeAvatarUpload(UUID userId, AvatarCompleteRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        String expectedPrefix = "avatars/" + userId + "/";
        String objectKey = request.objectKey() != null ? request.objectKey().trim() : "";
        if (!objectKey.startsWith(expectedPrefix)) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OBJECT_KEY",
                    "Mã tệp ảnh đại diện không hợp lệ hoặc không thuộc về tài khoản này."
            );
        }

        int lastDot = objectKey.lastIndexOf('.');
        if (lastDot == -1 || lastDot == objectKey.length() - 1) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OBJECT_KEY",
                    "Định dạng tệp ảnh đại diện không hợp lệ."
            );
        }

        String ext = objectKey.substring(lastDot + 1).toLowerCase();
        if (!Set.of("jpg", "jpeg", "png", "webp").contains(ext)) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_OBJECT_KEY",
                    "Định dạng tệp ảnh đại diện không được hỗ trợ."
            );
        }

        if (!storageService.objectExists(objectKey)) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "AVATAR_NOT_FOUND",
                    "Không tìm thấy tệp ảnh đại diện đã tải lên trên hệ thống lưu trữ."
            );
        }

        ObjectMetadata metadata = storageService.getObjectMetadata(objectKey);
        if (metadata == null) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_AVATAR_METADATA",
                    "Không thể đọc thông tin tệp ảnh đại diện từ hệ thống lưu trữ."
            );
        }

        String metadataContentType = metadata.contentType() != null ? metadata.contentType().trim().toLowerCase() : "";
        if (!ALLOWED_AVATAR_CONTENT_TYPES.contains(metadataContentType)) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_AVATAR_METADATA",
                    "Định dạng ảnh trên hệ thống lưu trữ không hợp lệ."
            );
        }

        if (metadata.contentLength() <= 0 || metadata.contentLength() > MAX_AVATAR_SIZE_BYTES) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_AVATAR_METADATA",
                    "Kích thước ảnh trên hệ thống lưu trữ vượt quá giới hạn 5MB."
            );
        }

        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> new Profile(userId));

        String previousAvatarKey = profile.getAvatarKey();
        profile.setAvatarKey(objectKey);
        profile = profileRepository.save(profile);

        // Delete old avatar if different
        if (previousAvatarKey != null && !previousAvatarKey.isBlank() && !previousAvatarKey.equals(objectKey)) {
            try {
                storageService.deleteObject(previousAvatarKey);
            } catch (Exception e) {
                log.warn("Không thể xóa ảnh đại diện cũ trên R2: {}", previousAvatarKey, e);
            }
        }

        StudentProfile studentProfile = studentProfileRepository.findById(userId).orElse(null);
        InstructorProfile instructorProfile = instructorProfileRepository.findById(userId).orElse(null);
        String avatarUrl = storageService.getPublicUrl(objectKey);

        return UserProfileResponse.from(user, profile, studentProfile, instructorProfile, avatarUrl);
    }

    @Transactional
    public UserProfileResponse uploadAvatarDirect(UUID userId, String contentType, byte[] data) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        String mime = contentType != null ? contentType.trim().toLowerCase() : "";
        if (!ALLOWED_AVATAR_CONTENT_TYPES.contains(mime)) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_CONTENT_TYPE",
                    "Định dạng hình ảnh không được hỗ trợ. Vui lòng chọn JPEG, PNG hoặc WebP."
            );
        }

        if (data == null || data.length <= 0 || data.length > MAX_AVATAR_SIZE_BYTES) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_FILE_SIZE",
                    "Kích thước ảnh đại diện không hợp lệ hoặc vượt quá 5MB."
            );
        }

        String extension = switch (mime) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "webp";
        };

        String objectKey = "avatars/" + userId + "/" + UUID.randomUUID() + "." + extension;
        storageService.putObject(objectKey, mime, data);

        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> new Profile(userId));

        String previousAvatarKey = profile.getAvatarKey();
        profile.setAvatarKey(objectKey);
        profile = profileRepository.save(profile);

        if (previousAvatarKey != null && !previousAvatarKey.isBlank() && !previousAvatarKey.equals(objectKey)) {
            try {
                storageService.deleteObject(previousAvatarKey);
            } catch (Exception e) {
                log.warn("Không thể xóa ảnh đại diện cũ trên R2: {}", previousAvatarKey, e);
            }
        }

        StudentProfile studentProfile = studentProfileRepository.findById(userId).orElse(null);
        InstructorProfile instructorProfile = instructorProfileRepository.findById(userId).orElse(null);
        String avatarUrl = storageService.getPublicUrl(objectKey);

        return UserProfileResponse.from(user, profile, studentProfile, instructorProfile, avatarUrl);
    }
}
