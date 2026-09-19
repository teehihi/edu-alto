package com.edualto.profile.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.profile.dto.UserProfileResponse;
import com.edualto.profile.service.ProfileService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PublicProfileController {

    private final ProfileService profileService;

    public PublicProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/profiles/{identifier}")
    public ApiResponse<UserProfileResponse> getProfileByIdentifier(@PathVariable String identifier) {
        return ApiResponse.ok(profileService.getProfileByIdentifier(identifier));
    }

    @GetMapping("/users/{identifier}/profile")
    public ApiResponse<UserProfileResponse> getUserProfileByIdentifier(@PathVariable String identifier) {
        return ApiResponse.ok(profileService.getProfileByIdentifier(identifier));
    }
}
