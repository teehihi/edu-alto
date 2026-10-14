package com.edualto.profile.service;

import com.edualto.common.exception.BusinessException;
import com.edualto.profile.domain.InstructorProfile;
import com.edualto.profile.domain.Profile;
import com.edualto.profile.domain.StudentProfile;
import com.edualto.profile.dto.AvatarCompleteRequest;
import com.edualto.profile.dto.AvatarUploadUrlRequest;
import com.edualto.profile.dto.AvatarUploadUrlResponse;
import com.edualto.profile.dto.PublicInstructorResponse;
import com.edualto.profile.dto.PublicProfileResponse;
import com.edualto.profile.dto.UpdateProfileRequest;
import com.edualto.profile.dto.UserProfileResponse;
import com.edualto.profile.repository.InstructorProfileRepository;
import com.edualto.profile.repository.ProfileRepository;
import com.edualto.profile.repository.StudentProfileRepository;
import com.edualto.storage.infrastructure.ImageWebpProcessor;
import com.edualto.storage.service.StorageService;
import com.edualto.storage.service.StorageCleanupService;
import com.edualto.user.domain.Role;
import com.edualto.user.domain.RoleName;
import com.edualto.user.domain.User;
import com.edualto.user.domain.UserStatus;
import com.edualto.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private static final Set<String> ALLOWED_AVATAR_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private static final long MAX_AVATAR_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final Pattern CUSTOM_HANDLE_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,30}$");

    private final ProfileRepository profileRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final InstructorProfileRepository instructorProfileRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final StorageCleanupService storageCleanup;
    private final ImageWebpProcessor imageWebpProcessor;

    public ProfileService(
            ProfileRepository profileRepository,
            StudentProfileRepository studentProfileRepository,
            InstructorProfileRepository instructorProfileRepository,
            UserRepository userRepository,
            StorageService storageService,
            StorageCleanupService storageCleanup,
            ImageWebpProcessor imageWebpProcessor
    ) {
        this.profileRepository = profileRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.instructorProfileRepository = instructorProfileRepository;
        this.userRepository = userRepository;
        this.storageService = storageService;
        this.storageCleanup = storageCleanup;
        this.imageWebpProcessor = imageWebpProcessor;
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

    @Transactional(readOnly = true)
    public PublicProfileResponse getProfileByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng");
        }

        String trimmed = identifier.trim();
        try {
            UUID userId = UUID.fromString(trimmed);
            return getPublicProfile(userId);
        } catch (IllegalArgumentException ignored) {
            // Identifier is not a UUID, search by custom handle
        }

        Profile profile = profileRepository.findByCustomHandleIgnoreCase(trimmed)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng"));

        return getPublicProfile(profile.getUserId());
    }

    @Transactional(readOnly = true)
    public Page<PublicInstructorResponse> getPublicInstructors(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<User> users = userRepository.findAllByRoleAndStatus(
                RoleName.INSTRUCTOR,
                UserStatus.ACTIVE,
                pageable
        );
        List<UUID> userIds = users.getContent().stream().map(User::getId).toList();
        Map<UUID, Profile> profiles = profileRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(Profile::getUserId, profile -> profile));
        Map<UUID, InstructorProfile> instructorProfiles = instructorProfileRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(InstructorProfile::getUserId, profile -> profile));

        return users.map(user -> {
            Profile profile = profiles.get(user.getId());
            InstructorProfile instructorProfile = instructorProfiles.get(user.getId());
            String avatarUrl = profile == null || profile.getAvatarKey() == null || profile.getAvatarKey().isBlank()
                    ? null
                    : storageService.getPublicUrl(profile.getAvatarKey());

            return new PublicInstructorResponse(
                    user.getId(),
                    user.getFullName(),
                    profile == null ? null : profile.getHeadline(),
                    profile == null ? null : profile.getBio(),
                    avatarUrl,
                    profile == null ? null : profile.getXUrl(),
                    profile == null ? null : profile.getLinkedinUrl(),
                    profile == null ? null : profile.getWebsiteUrl(),
                    instructorProfile == null ? null : instructorProfile.getExpertise(),
                    instructorProfile == null ? null : instructorProfile.getExperienceYears(),
                    instructorProfile == null ? null : instructorProfile.getTeachingExperience(),
                    instructorProfile == null ? null : instructorProfile.getSpecialties()
            );
        });
    }

    private PublicProfileResponse getPublicProfile(UUID userId) {
        UserProfileResponse profile = getProfile(userId);
        if (profile.status() != UserStatus.ACTIVE) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Không tìm thấy người dùng");
        }
        return PublicProfileResponse.from(profile);
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

        String targetHandle = profile.getCustomHandle();
        if (request.customHandle() != null) {
            String trimmedHandle = request.customHandle().trim().toLowerCase();
            if (trimmedHandle.isEmpty()) {
                targetHandle = null;
            } else {
                if (!CUSTOM_HANDLE_PATTERN.matcher(trimmedHandle).matches()) {
                    throw new BusinessException(
                            HttpStatus.BAD_REQUEST,
                            "INVALID_CUSTOM_HANDLE",
                            "Đường dẫn cá nhân chỉ gồm 3-30 ký tự (chữ cái, số, dấu ., _ hoặc -)"
                    );
                }
                if (profileRepository.existsByCustomHandleIgnoreCaseAndUserIdNot(trimmedHandle, userId)) {
                    throw new BusinessException(
                            HttpStatus.CONFLICT,
                            "HANDLE_ALREADY_EXISTS",
                            "Đường dẫn cá nhân này đã được sử dụng bởi người khác"
                    );
                }
                targetHandle = trimmedHandle;
            }
        }

        String resolvedTiktok = request.tiktokUrl() != null
                ? request.tiktokUrl().trim()
                : (request.xUrl() != null ? request.xUrl().trim() : profile.getTiktokUrl());

        profile.update(
                request.headline() != null ? request.headline().trim() : profile.getHeadline(),
                request.bio() != null ? request.bio().trim() : profile.getBio(),
                request.language() != null ? request.language().trim() : profile.getLanguage(),
                request.websiteUrl() != null ? request.websiteUrl().trim() : profile.getWebsiteUrl(),
                resolvedTiktok,
                resolvedTiktok,
                request.linkedinUrl() != null ? request.linkedinUrl().trim() : profile.getLinkedinUrl(),
                request.youtubeUrl() != null ? request.youtubeUrl().trim() : profile.getYoutubeUrl(),
                request.facebookUrl() != null ? request.facebookUrl().trim() : profile.getFacebookUrl(),
                targetHandle
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
        throw directImageUploadDisabled();
    }

    @Transactional
    public UserProfileResponse completeAvatarUpload(UUID userId, AvatarCompleteRequest request) {
        throw directImageUploadDisabled();
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

        byte[] webpBytes = imageWebpProcessor.normalize(data, mime, 512);
        String objectKey = "avatars/" + userId + "/" + UUID.randomUUID() + ".webp";
        storageService.putObject(objectKey, "image/webp", webpBytes);

        Profile profile = profileRepository.findById(userId)
                .orElseGet(() -> new Profile(userId));

        String previousAvatarKey = profile.getAvatarKey();
        profile.setAvatarKey(objectKey);
        profile = profileRepository.save(profile);

        if (previousAvatarKey != null && !previousAvatarKey.isBlank() && !previousAvatarKey.equals(objectKey)) {
            storageCleanup.deleteAfterCommit(List.of(previousAvatarKey));
        }

        StudentProfile studentProfile = studentProfileRepository.findById(userId).orElse(null);
        InstructorProfile instructorProfile = instructorProfileRepository.findById(userId).orElse(null);
        String avatarUrl = storageService.getPublicUrl(objectKey);

        return UserProfileResponse.from(user, profile, studentProfile, instructorProfile, avatarUrl);
    }

    private BusinessException directImageUploadDisabled() {
        return new BusinessException(
                HttpStatus.GONE,
                "DIRECT_IMAGE_UPLOAD_DISABLED",
                "Tải ảnh trực tiếp lên hệ thống lưu trữ đã tắt để chuẩn hóa ảnh an toàn. Vui lòng dùng biểu mẫu tải ảnh."
        );
    }
}
