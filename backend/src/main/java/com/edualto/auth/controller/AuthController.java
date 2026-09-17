package com.edualto.auth.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.auth.dto.AuthMessageResponse;
import com.edualto.auth.dto.AuthTokenResponse;
import com.edualto.auth.dto.EmailRequest;
import com.edualto.auth.dto.LoginRequest;
import com.edualto.auth.dto.RefreshTokenRequest;
import com.edualto.auth.dto.RegisterRequest;
import com.edualto.auth.dto.ResetPasswordRequest;
import com.edualto.auth.dto.VerifyOtpRequest;
import com.edualto.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ApiResponse<AuthMessageResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(authService.register(request));
    }

    @PostMapping("/verify-email")
    public ApiResponse<AuthMessageResponse> verifyEmail(@Valid @RequestBody VerifyOtpRequest request) {
        return ApiResponse.ok(authService.verifyEmail(request));
    }

    @PostMapping("/resend-verification")
    public ApiResponse<AuthMessageResponse> resendVerification(@Valid @RequestBody EmailRequest request) {
        return ApiResponse.ok(authService.resendVerification(request.email()));
    }

    @PostMapping("/login")
    public ApiResponse<AuthTokenResponse> login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent
    ) {
        return ApiResponse.ok(authService.login(request, userAgent));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthTokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ApiResponse<AuthMessageResponse> logout(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.logout(request.refreshToken()));
    }

    @PostMapping("/forgot-password")
    public ApiResponse<AuthMessageResponse> forgotPassword(@Valid @RequestBody EmailRequest request) {
        return ApiResponse.ok(authService.forgotPassword(request.email()));
    }

    @PostMapping("/verify-reset-otp")
    public ApiResponse<AuthMessageResponse> verifyResetOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ApiResponse.ok(authService.verifyResetOtp(request));
    }

    @PostMapping("/reset-password")
    public ApiResponse<AuthMessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ApiResponse.ok(authService.resetPassword(request));
    }
}
