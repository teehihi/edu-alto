package com.edualto.profile.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.profile.dto.PublicInstructorResponse;
import com.edualto.profile.dto.PublicProfileResponse;
import com.edualto.profile.service.ProfileService;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PublicProfileController {

    private final ProfileService profileService;

    public PublicProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/instructors")
    public ApiResponse<List<PublicInstructorResponse>> listPublicInstructors(
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "12") int size
    ) {
        Page<PublicInstructorResponse> instructorsPage = profileService.getPublicInstructors(page, size);
        PageMeta pageMeta = new PageMeta(
                instructorsPage.getNumber(),
                instructorsPage.getSize(),
                instructorsPage.getTotalElements(),
                instructorsPage.getTotalPages()
        );
        return ApiResponse.page(instructorsPage.getContent(), pageMeta);
    }

    @GetMapping("/profiles/{identifier}")
    public ApiResponse<PublicProfileResponse> getProfileByIdentifier(@PathVariable String identifier) {
        return ApiResponse.ok(profileService.getProfileByIdentifier(identifier));
    }

    @GetMapping("/users/{identifier}/profile")
    public ApiResponse<PublicProfileResponse> getUserProfileByIdentifier(@PathVariable String identifier) {
        return ApiResponse.ok(profileService.getProfileByIdentifier(identifier));
    }
}
