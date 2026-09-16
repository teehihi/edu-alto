package com.edualto.auth.controller;

import com.edualto.common.api.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @PostMapping("/register")
    public ApiResponse<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(Map.of(
                "message", "Yêu cầu đăng ký đã được ghi nhận. OTP email sẽ được triển khai ở phase xác thực."
        ));
    }

    public record RegisterRequest(
            @NotBlank(message = "Vui lòng nhập họ và tên")
            String fullName,
            @NotBlank(message = "Vui lòng nhập email")
            @Email(message = "Email không hợp lệ")
            String email,
            @NotBlank(message = "Vui lòng nhập mật khẩu")
            @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
            String password,
            @NotBlank(message = "Vui lòng xác nhận mật khẩu")
            String confirmPassword
    ) {
    }
}
