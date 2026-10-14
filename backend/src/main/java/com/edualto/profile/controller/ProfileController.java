package com.edualto.profile.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.exception.BusinessException;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.profile.dto.AvatarCompleteRequest;
import com.edualto.profile.dto.AvatarUploadUrlRequest;
import com.edualto.profile.dto.AvatarUploadUrlResponse;
import com.edualto.profile.dto.UpdateProfileRequest;
import com.edualto.profile.dto.UserProfileResponse;
import com.edualto.profile.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/me/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ApiResponse<UserProfileResponse> getProfile(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ApiResponse.ok(profileService.getProfile(principal.id()));
    }

    @PutMapping
    public ApiResponse<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ApiResponse.ok(profileService.updateProfile(principal.id(), request));
    }

    @Deprecated
    @Operation(summary = "Ngừng sử dụng: hãy tải ảnh multipart để chuẩn hóa trước khi lưu", deprecated = true)
    @PostMapping("/avatar/upload-url")
    public ApiResponse<AvatarUploadUrlResponse> generateAvatarUploadUrl(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody AvatarUploadUrlRequest request
    ) {
        return ApiResponse.ok(profileService.generateAvatarUploadUrl(principal.id(), request));
    }

    @Deprecated
    @Operation(summary = "Ngừng sử dụng: tải ảnh trực tiếp lên R2 đã tắt", deprecated = true)
    @PostMapping("/avatar/complete")
    public ApiResponse<UserProfileResponse> completeAvatarUpload(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody AvatarCompleteRequest request
    ) {
        return ApiResponse.ok(profileService.completeAvatarUpload(principal.id(), request));
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserProfileResponse> uploadAvatar(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        if (file.isEmpty() || file.getSize() > 5L * 1024 * 1024) {
            throw new BusinessException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_FILE_SIZE",
                    "Ảnh đại diện phải có dung lượng từ 1 byte đến 5MB."
            );
        }
        return ApiResponse.ok(profileService.uploadAvatarDirect(
                principal.id(),
                file.getContentType(),
                file.getBytes()
        ));
    }
}
