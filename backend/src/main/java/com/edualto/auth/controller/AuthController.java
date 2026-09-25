package com.edualto.auth.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.CookieHelper;
import com.edualto.auth.dto.AuthMessageResponse;
import com.edualto.auth.dto.AuthTokenResponse;
import com.edualto.auth.dto.EmailRequest;
import com.edualto.auth.dto.LoginRequest;
import com.edualto.auth.dto.RegisterRequest;
import com.edualto.auth.dto.ResetPasswordRequest;
import com.edualto.auth.dto.VerifyOtpRequest;
import com.edualto.auth.service.AuthService;
import com.edualto.auth.service.AuthService.AuthResult;
import com.edualto.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final CookieHelper cookieHelper;

    public AuthController(AuthService authService, CookieHelper cookieHelper) {
        this.authService = authService;
        this.cookieHelper = cookieHelper;
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
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            HttpServletResponse response
    ) {
        AuthResult result = authService.login(request, userAgent);
        cookieHelper.setRefreshTokenCookie(response, result.refreshToken());
        return ApiResponse.ok(result.response());
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthTokenResponse> refresh(
            @CookieValue(name = "edualto.refresh", required = false) String refreshToken,
            HttpServletResponse response
    ) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
        }
        AuthResult result = authService.refresh(refreshToken);
        cookieHelper.setRefreshTokenCookie(response, result.refreshToken());
        return ApiResponse.ok(result.response());
    }

    @PostMapping("/logout")
    public ApiResponse<AuthMessageResponse> logout(
            @CookieValue(name = "edualto.refresh", required = false) String refreshToken,
            HttpServletResponse response
    ) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        cookieHelper.clearRefreshTokenCookie(response);
        return ApiResponse.ok(new AuthMessageResponse("Đăng xuất thành công."));
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
