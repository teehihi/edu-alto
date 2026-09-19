package com.edualto.profile.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.profile.dto.AvatarCompleteRequest;
import com.edualto.profile.dto.AvatarUploadUrlRequest;
import com.edualto.profile.dto.AvatarUploadUrlResponse;
import com.edualto.profile.dto.UpdateProfileRequest;
import com.edualto.profile.dto.UserProfileResponse;
import com.edualto.profile.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @PostMapping("/avatar/upload-url")
    public ApiResponse<AvatarUploadUrlResponse> generateAvatarUploadUrl(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody AvatarUploadUrlRequest request
    ) {
        return ApiResponse.ok(profileService.generateAvatarUploadUrl(principal.id(), request));
    }

    @PostMapping("/avatar/complete")
    public ApiResponse<UserProfileResponse> completeAvatarUpload(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody AvatarCompleteRequest request
    ) {
        return ApiResponse.ok(profileService.completeAvatarUpload(principal.id(), request));
    }

    @PostMapping(value = "/avatar", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UserProfileResponse> uploadAvatar(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) throws java.io.IOException {
        return ApiResponse.ok(profileService.uploadAvatarDirect(
                principal.id(),
                file.getContentType(),
                file.getBytes()
        ));
    }
}
