package com.edualto.user.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.user.dto.UpdateCurrentUserRequest;
import com.edualto.user.dto.UserResponse;
import com.edualto.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class CurrentUserController {

    private final UserService userService;

    public CurrentUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ApiResponse<UserResponse> currentUser(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ApiResponse.ok(UserResponse.from(userService.requireById(principal.id())));
    }

    @PutMapping
    public ApiResponse<UserResponse> updateCurrentUser(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody UpdateCurrentUserRequest request
    ) {
        return ApiResponse.ok(UserResponse.from(userService.updateCurrentUser(principal.id(), request)));
    }
}
